from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks,Query

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.content_generator.content_generator import ContentGenerator
from app.content_generator.version_service import ContentVersionService
from app.auth.firebase_auth import get_current_user
from app.content_generator.models import ContentItem
from app.users.model import User
from app.document_upload.model import UserCollection
from app.core.database import get_db
import logging
import uuid
from firebase_admin import storage
from pydantic import BaseModel, Field
from typing import Literal, Optional
import requests



logger = logging.getLogger(__name__)
router = APIRouter()


class ContentGenerateRequest(BaseModel):
    """Request model for generating educational content."""
    contentType: Literal["flashcards", "slides"] = Field(..., description="Type of content to generate")
    contentTopic: str = Field(..., description="Topic for the content")
    difficulty: Literal["easy", "medium", "hard"] = Field("medium", description="Difficulty level")
    length: Literal["short", "medium", "long"] = Field("medium", description="Length of content")
    tone: Literal["instructive", "engaging", "formal"] = Field("instructive", description="Tone of content")
    collection_name: str = Field("default", description="Name of the collection in vector DB")
    special_instructions: Optional[str] = Field("", description="Special user instructions for content generation")

class ContentModificationRequest(BaseModel):
    """Request model for modifying existing content."""
    modification_instructions: str = Field(..., description="Instructions for how to modify the content")
    source_version: Optional[int] = Field(None, description="Specific version to modify from (defaults to latest)")

class ContentVersionResponse(BaseModel):
    """Response model for content version information."""
    id: str
    version_number: int
    content_url: str
    topic: Optional[str]
    content_type: Optional[str]
    modification_instructions: Optional[str]
    created_at: Optional[str]
    is_latest_version: bool


@router.post("/generate")
async def generate_content(
    request: ContentGenerateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generates educational content (flashcards or slides) based on user request."""
    try:
        # Validate collection_name exists in user_collections
        collection = db.query(UserCollection).filter(
            UserCollection.user_id == user["uid"],
            UserCollection.collection_name == request.collection_name
        ).first()
        if not collection:
            raise HTTPException(status_code=400, detail=f"Collection '{request.collection_name}' not found for user")

        # Ensure full_collection_name is a string
        full_collection_name = str(collection.full_collection_name)
        if not isinstance(full_collection_name, str):
            logger.error(f"full_collection_name is not a string: {type(full_collection_name)}")
            raise HTTPException(status_code=500, detail="Internal error: Invalid collection name type")

        content_generator = ContentGenerator()
        content_id = str(uuid.uuid4())
        
        try:
            await content_generator.generate_and_store_content(
                content_id=content_id,
                user_id=user["uid"],
                content_type=request.contentType,
                topic=request.contentTopic,
                difficulty=request.difficulty,
                length=request.length,
                tone=request.tone,
                collection_name=request.collection_name,
                full_collection_name=full_collection_name,
                special_instructions=request.special_instructions or "",
                db=db
            )
            
            # Get the created content from database
            created_content = db.query(ContentItem).filter(ContentItem.id == content_id).first()
            
            # Check if content needs moderation
            is_pending = bool(created_content and created_content.content_type == "slides_pending")
            
            return {
                "contentId": content_id,
                "message": "Content generation completed - slides pending moderation" if is_pending else "Content generation completed",
                "status": "pending_moderation" if is_pending else "completed",
                "metadata": {
                    "type": "slides" if is_pending else request.contentType,
                    "topic": request.contentTopic,
                    "createdAt": created_content.created_at if created_content else None,
                    "needsModeration": is_pending
                }
            }
        except ValueError as e:
            # Handle specific content generation errors (e.g., no documents found, invalid format)
            logger.error(f"Content generation failed for user {user['uid']}: {str(e)}")
            raise HTTPException(status_code=400, detail="Content generation failed. Please check your input and try again.")
        except Exception as e:
            # Handle any other content generation errors (e.g., max retries exceeded)
            logger.error(f"Content generation failed for user {user['uid']}: {str(e)}")
            raise HTTPException(status_code=500, detail="Content generation failed. Please try again later.")
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error generating content for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/user")
async def get_user_content(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
    filter_topic: Optional[str] = Query(
        None,
        title="Filter by topic",
        description="Only return items whose topic contains this substring (case-insensitive)"
    ),
    filter_collection: Optional[List[str]] = Query(
        None,
        title="Filter by collection",
        description="Only return items from these collections (can specify multiple)"
    ),
    start_date: Optional[str] = Query(None, description="Start date filter (ISO format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (ISO format: YYYY-MM-DD)"),
    sort_by: Optional[str] = Query(
        "created_at",
        title="Sort by field",
        description="Field to sort by: 'created_at' or 'topic'",
        regex="^(created_at|topic)$"
    ),
    sort_order: Optional[str] = Query(
        "desc",
        title="Sort order",
        description="Sort order: 'asc' for ascending, 'desc' for descending",
        regex="^(asc|desc)$"
    ),
) -> Dict[str, Any]:
    """Lists all content generated by the user (latest versions only)."""
    try:
        # Only return latest versions
        query = db.query(ContentItem).filter(
            ContentItem.user_id == user["uid"],
            ContentItem.is_latest_version == True
        )

        # only apply the topic filter if it's non-null *and* not just whitespace
        if filter_topic and filter_topic.strip():
            pattern = f"%{filter_topic.strip()}%"
            query = query.filter(ContentItem.topic.ilike(pattern))

        # Apply collection filter if provided
        if filter_collection:
            # Remove empty/whitespace-only collection names
            valid_collections = [c.strip() for c in filter_collection if c and c.strip()]
            if valid_collections:
                from sqlalchemy import func
                # Use trimmed comparison for consistent matching
                query = query.filter(func.trim(ContentItem.collection_name).in_(valid_collections))

        # Apply date range filtering
        if start_date:
            try:
                from datetime import datetime, timezone
                start_date_obj = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                query = query.filter(ContentItem.created_at >= start_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                from datetime import datetime, timezone
                end_date_obj = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                query = query.filter(ContentItem.created_at <= end_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

        # Apply sorting
        if sort_by == "topic":
            if sort_order == "asc":
                query = query.order_by(ContentItem.topic.asc())
            else:
                query = query.order_by(ContentItem.topic.desc())
        else:  # sort_by == "created_at" (default)
            if sort_order == "asc":
                query = query.order_by(ContentItem.created_at.asc())
            else:
                query = query.order_by(ContentItem.created_at.desc())

        contents = query.all()

            
        return {
            "contents": [
                {
                    "contentId": c.id,
                    "topic": c.topic,
                    "type": c.content_type,
                    "createdAt": c.created_at,
                    "collection_name": c.collection_name
                }
                for c in contents
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching user content for {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/{contentId}")
async def get_content(
    contentId: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves previously generated content by ID. Always returns the latest version."""
    try:
        # First, try to find the latest version of this content
        latest_content = db.query(ContentItem).filter(
            ContentItem.user_id == user["uid"],
            ContentItem.is_latest_version == True
        ).filter(
            (ContentItem.id == contentId) | 
            (ContentItem.parent_content_id == contentId)
        ).first()
        
        # If no latest version found, try to get the content directly
        if not latest_content:
            latest_content = db.query(ContentItem).filter(
                ContentItem.id == contentId,
                ContentItem.user_id == user["uid"]
            ).first()
        
        if not latest_content:
            raise HTTPException(status_code=404, detail="Content not found or access denied")

        # For flashcards, fetch and return the JSON content directly
        if latest_content.content_type == "flashcards":
            try:
                # Fetch the JSON content from Firebase Storage
                response = requests.get(latest_content.content_url, timeout=30)
                response.raise_for_status()
                
                # Parse and return the JSON content
                flashcards_data = response.json()
                
                return {
                    "contentId": latest_content.id,
                    "content": flashcards_data,  # Return parsed JSON data
                    "metadata": {
                        "type": latest_content.content_type,
                        "topic": latest_content.topic,
                        "createdAt": latest_content.created_at,
                        "collection_name": latest_content.collection_name
                    }
                }
            except requests.RequestException as e:
                logger.error(f"Error fetching flashcards content from storage for {contentId}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to fetch content from storage")
            except ValueError as e:
                logger.error(f"Error parsing flashcards JSON for {contentId}: {str(e)}")
                raise HTTPException(status_code=500, detail="Invalid content format")
        
        # For slides and other content types, return the URL
        return {
            "contentId": latest_content.id,
            "content": latest_content.content_url,  # Return URL for slides/PDFs
            "metadata": {
                "type": latest_content.content_type,
                "topic": latest_content.topic,
                "createdAt": latest_content.created_at,
                "collection_name": latest_content.collection_name
            }
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching content {contentId} for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")



# @router.put("/{contentId}")
# async def update_content(
#     contentId: str,
#     content_data: Dict[str, Any],
#     user: Dict[str, Any] = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ) -> Dict[str, Any]:
#     """Allows user to moderate or update generated content."""
#     try:
#         content = db.query(ContentItem).filter(
#             ContentItem.id == contentId,
#             ContentItem.user_id == user["uid"]
#         ).first()
#         if not content:
#             raise HTTPException(status_code=404, detail="Content not found or access denied")

#         # Update fields if provided
#         if "topic" in content_data:
#             content.topic = content_data["topic"]
#         if "content_type" in content_data and content_data["content_type"] in ["flashcards", "slides"]:
#             content.content_type = content_data["content_type"]
#         if "content_url" in content_data:
#             # Validate and update Firebase URL
            
#             blob = storage.bucket().blob(content_data["content_url"].replace(f"https://storage.googleapis.com/{storage.bucket().name}/", ""))
#             if blob.exists():
#                 content.content_url = content_data["content_url"]
#             else:
#                 raise HTTPException(status_code=400, detail="Invalid content_url")

#         db.commit()
#         logger.debug(f"Updated content {contentId} for user {user['uid']}")
#         return {
#             "contentId": content.id,
#             "message": "Content updated successfully",
#             "metadata": {
#                 "type": content.content_type,
#                 "topic": content.topic,
#                 "createdAt": content.created_at
#             }
#         }
#     except HTTPException as e:
#         raise
#     except Exception as e:
#         db.rollback()
#         logger.error(f"Error updating content {contentId} ")
#         raise HTTPException(status_code=500, detail=f"Error updating content ")

@router.delete("/{contentId}")
async def delete_content(
    contentId: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Allows user to delete generated content."""
    try:
        content = db.query(ContentItem).filter(
            ContentItem.id == contentId,
            ContentItem.user_id == user["uid"]
        ).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found or access denied")

        # Delete from Firebase
        
        blob = storage.bucket().blob(content.content_url.replace(f"https://storage.googleapis.com/{storage.bucket().name}/", ""))
        if blob.exists():
            blob.delete()

        # Delete from database
        db.delete(content)
        db.commit()
        logger.debug(f"Deleted content {contentId} for user {user['uid']}")
        return {"message": f"Content {contentId} deleted successfully"}
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting content {contentId} for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

class UpdateTopicRequest(BaseModel):
    topic: str

@router.patch("/topic/{contentId}")
async def update_content_topic(
    contentId: str,
    data: UpdateTopicRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update the topic name of a content item."""
    try:
        new_topic = data.topic
        content = db.query(ContentItem).filter(
            ContentItem.id == contentId,
            ContentItem.user_id == user["uid"]
        ).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found or access denied")
        content.topic = new_topic  # type: ignore
        db.commit()
        logger.debug(f"Updated topic for content {contentId} to '{new_topic}' for user {user['uid']}")
        return {
            "contentId": content.id,
            "message": "Topic updated successfully",
            "topic": content.topic
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating topic for content {contentId} for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/collections/{collection_name}/content")
async def get_content_by_collection(
    collection_name: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves all content items for a specific collection."""
    try:
        # Validate collection exists
        collection = db.query(UserCollection).filter(
            UserCollection.user_id == user["uid"],
            UserCollection.collection_name == collection_name
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")

        # Get content items for this collection
        content_generator = ContentGenerator()
        content_items = content_generator.get_content_by_collection(
            user_id=user["uid"],
            collection_name=collection_name,
            db=db
        )
        
        # Format response
        formatted_content = []
        for item in content_items:
            formatted_content.append({
                "id": str(item.id),
                "content_url": item.content_url,
                "raw_source": item.raw_source,
                "topic": item.topic,
                "content_type": item.content_type,
                "created_at": item.created_at.isoformat() if item.created_at else None
            })
        
        return {
            "collection_name": collection_name,
            "content_count": len(formatted_content),
            "content_items": formatted_content
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving content for collection {collection_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving content")

# Content Modification and Versioning Endpoints

@router.post("/{content_id}/modify")
async def modify_content(
    content_id: str,
    request: ContentModificationRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a modified version of existing content."""
    try:
        version_service = ContentVersionService()
        result = await version_service.modify_content(
            content_id=content_id,
            user_id=user["uid"],
            modification_instructions=request.modification_instructions,
            source_version=request.source_version,
            db=db
        )
        
        return {
            "status": "success",
            "message": "Content modified successfully",
            "data": result
        }
        
    except ValueError as e:
        logger.error(f"Content modification failed for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error modifying content {content_id} for user {user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Content modification failed. Please try again later.")

@router.get("/{content_id}/versions")
async def get_content_versions(
    content_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all versions of a content item."""
    try:
        version_service = ContentVersionService()
        versions = version_service.get_content_versions(
            content_id=content_id,
            user_id=user["uid"],
            db=db
        )
        
        return {
            "status": "success",
            "content_id": content_id,
            "versions": versions,
            "total_versions": len(versions)
        }
        
    except Exception as e:
        logger.error(f"Error getting versions for content {content_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving content versions")

@router.get("/{content_id}/modifications")
async def get_modification_history(
    content_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get modification history for a content item."""
    try:
        version_service = ContentVersionService()
        modifications = version_service.get_modification_history(
            content_id=content_id,
            user_id=user["uid"],
            db=db
        )
        
        return {
            "status": "success",
            "content_id": content_id,
            "modifications": modifications,
            "total_modifications": len(modifications)
        }
        
    except Exception as e:
        logger.error(f"Error getting modification history for content {content_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving modification history")

@router.delete("/{content_id}/versions/{version_number}")
async def delete_content_version(
    content_id: str,
    version_number: int,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete a specific version of content."""
    try:
        version_service = ContentVersionService()
        success = version_service.delete_content_version(
            content_id=content_id,
            version_number=version_number,
            user_id=user["uid"],
            db=db
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Version {version_number} deleted successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to delete version")
            
    except ValueError as e:
        logger.error(f"Version deletion failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting version {version_number} of content {content_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting content version")