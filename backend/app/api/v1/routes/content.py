from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.content_generator.content_generator import ContentGenerator
from app.auth.firebase_auth import get_current_user
from app.content_generator.models import ContentItem
from app.users.model import User
from app.document_upload.model import UserCollection
from app.core.database import get_db
import logging
import uuid
from firebase_admin import storage
from pydantic import BaseModel, Field
from typing import Literal
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
            raise HTTPException(status_code=400, detail=f"Content generation failed: {str(e)}")
        except Exception as e:
            # Handle any other content generation errors (e.g., max retries exceeded)
            logger.error(f"Content generation failed for user {user['uid']}: {str(e)}")
            raise HTTPException(status_code=500, detail="Content generation failed after multiple attempts. Please try again later.")
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error generating content ")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/user")
async def get_user_content(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Lists all content generated by the user."""
    try:
        contents = db.query(ContentItem).filter(ContentItem.user_id == user["uid"]).all()
        return {
            "contents": [
                {
                    "contentId": c.id,
                    "topic": c.topic,
                    "type": c.content_type,
                    "createdAt": c.created_at
                }
                for c in contents
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching user content for {user['uid']} ")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/{contentId}")
async def get_content(
    contentId: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves previously generated content by ID."""
    try:
        content = db.query(ContentItem).filter(
            ContentItem.id == contentId,
            ContentItem.user_id == user["uid"]
        ).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found or access denied")

        return {
            "contentId": content.id,
            "content": content.content_url,
            "metadata": {
                "type": content.content_type,
                "topic": content.topic,
                "createdAt": content.created_at
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching content {contentId} ")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")



@router.put("/{contentId}")
async def update_content(
    contentId: str,
    content_data: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Allows user to moderate or update generated content."""
    try:
        content = db.query(ContentItem).filter(
            ContentItem.id == contentId,
            ContentItem.user_id == user["uid"]
        ).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found or access denied")

        # Update fields if provided
        if "topic" in content_data:
            content.topic = content_data["topic"]
        if "content_type" in content_data and content_data["content_type"] in ["flashcards", "slides"]:
            content.content_type = content_data["content_type"]
        if "content_url" in content_data:
            # Validate and update Firebase URL
            
            blob = storage.bucket().blob(content_data["content_url"].replace(f"https://storage.googleapis.com/{storage.bucket().name}/", ""))
            if blob.exists():
                content.content_url = content_data["content_url"]
            else:
                raise HTTPException(status_code=400, detail="Invalid content_url")

        db.commit()
        logger.debug(f"Updated content {contentId} for user {user['uid']}")
        return {
            "contentId": content.id,
            "message": "Content updated successfully",
            "metadata": {
                "type": content.content_type,
                "topic": content.topic,
                "createdAt": content.created_at
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating content {contentId} ")
        raise HTTPException(status_code=500, detail=f"Error updating content ")

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
        logger.error(f"Error deleting content {contentId} ")
        raise HTTPException(status_code=500, detail=f"Error deleting content ")

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
        logger.error(f"Error updating topic for content {contentId} ")
        raise HTTPException(status_code=500, detail=f"Error updating topic ")

# Helper function to check if user is a moderator
async def check_moderator_access(user: Dict[str, Any], db: Session) -> bool:
    """Check if the current user is a moderator."""
    user_record = db.query(User).filter(User.uid == user["uid"]).first()
    return user_record and user_record.is_moderator

@router.get("/{contentId}/latex")
async def get_content_latex(
    contentId: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves LaTeX source for slides content. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        content = db.query(ContentItem).filter(ContentItem.id == contentId).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        if content.content_type not in ["slides", "slides_pending"]:
            raise HTTPException(status_code=400, detail="LaTeX source only available for slides content")
        
        raw_source_url = getattr(content, 'raw_source')
        if not raw_source_url or raw_source_url.strip() == "":
            raise HTTPException(status_code=404, detail="LaTeX source not found for this content")
        
        # Fetch LaTeX content from Firebase URL
        try:
            response = requests.get(raw_source_url)
            response.raise_for_status()
            latex_content = response.text
        except Exception as e:
            logger.error(f"Error fetching LaTeX from URL {raw_source_url}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching LaTeX source")

        return {
            "contentId": content.id,
            "latex_source": latex_content,
            "latex_url": raw_source_url,
            "metadata": {
                "type": content.content_type,
                "topic": content.topic,
                "createdAt": content.created_at,
                "user_id": content.user_id
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching LaTeX source for content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/pending/moderation")
async def get_pending_content(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Lists all content pending moderation. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        pending_contents = db.query(ContentItem).filter(ContentItem.content_type == "slides_pending").all()
        return {
            "pending_contents": [
                {
                    "contentId": c.id,
                    "topic": c.topic,
                    "user_id": c.user_id,
                    "createdAt": c.created_at,
                    "latex_url": getattr(c, 'raw_source')
                }
                for c in pending_contents
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending content: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/{contentId}/moderate")
async def moderate_content(
    contentId: str,
    content_data: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Allows moderators to update pending content and approve it."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        content = db.query(ContentItem).filter(ContentItem.id == contentId).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Update LaTeX source if provided
        if "latex_source" in content_data:
            # Upload new LaTeX content to Firebase and update URL
            try:
                bucket = storage.bucket()
                # Determine the storage path based on content type
                if getattr(content, 'content_type') == "slides_pending":
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
                else:
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
                
                blob = bucket.blob(storage_path)
                blob.upload_from_string(content_data["latex_source"], content_type="text/x-tex")
                blob.make_public()
                setattr(content, 'raw_source', blob.public_url)
            except Exception as e:
                logger.error(f"Error uploading LaTeX source: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading LaTeX source")
        
        # Update content URL (PDF) if provided
        if "content_url" in content_data:
            # Validate Firebase URL
            blob = storage.bucket().blob(content_data["content_url"].replace(f"https://storage.googleapis.com/{storage.bucket().name}/", ""))
            if blob.exists():
                setattr(content, 'content_url', content_data["content_url"])
            else:
                raise HTTPException(status_code=400, detail="Invalid content_url")
        
        # Approve content if requested
        if "approve" in content_data and content_data["approve"] == True:
            if getattr(content, 'content_type') == "slides_pending":
                setattr(content, 'content_type', "slides")
        
        # Update topic if provided
        if "topic" in content_data:
            setattr(content, 'topic', content_data["topic"])

        db.commit()
        logger.debug(f"Moderated content {contentId} by moderator {user['uid']}")
        return {
            "contentId": content.id,
            "message": "Content moderated successfully",
            "metadata": {
                "type": content.content_type,
                "topic": content.topic,
                "createdAt": content.created_at,
                "approved": content.content_type == "slides"
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error moderating content")

class EditLatexRequest(BaseModel):
    latex_content: str

@router.put("/{contentId}/latex")
async def edit_content_latex(
    contentId: str,
    request: EditLatexRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Edit LaTeX source for slides content. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        content = db.query(ContentItem).filter(ContentItem.id == contentId).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        if content.content_type not in ["slides", "slides_pending"]:
            raise HTTPException(status_code=400, detail="LaTeX editing only available for slides content")
        
        # Upload updated LaTeX content to Firebase
        try:
            bucket = storage.bucket()
            # Determine the storage path based on content type
            if getattr(content, 'content_type') == "slides_pending":
                storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
            else:
                storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
            
            blob = bucket.blob(storage_path)
            blob.upload_from_string(request.latex_content, content_type="text/x-tex")
            blob.make_public()
            
            # Update the raw_source URL in database
            setattr(content, 'raw_source', blob.public_url)
            db.commit()
            
            logger.debug(f"Updated LaTeX source for content {contentId} by moderator {user['uid']}")
            return {
                "contentId": content.id,
                "message": "LaTeX source updated successfully",
                "latex_url": blob.public_url,
                "metadata": {
                    "type": content.content_type,
                    "topic": content.topic,
                    "createdAt": content.created_at
                }
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating LaTeX source: {str(e)}")
            raise HTTPException(status_code=500, detail="Error updating LaTeX source")
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error editing LaTeX for content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")