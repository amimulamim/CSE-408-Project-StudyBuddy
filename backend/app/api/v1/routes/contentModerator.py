from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.auth.firebase_auth import get_current_user
from app.content_generator.models import ContentItem
from app.users.model import User
from app.core.database import get_db
from pydantic import BaseModel, Field, field_validator

from app.content_moderator.models import (
    ModeratorProfile, ModeratorDomain, ModeratorTopic, 
    ModeratorContentHistory, ModeratorQuizHistory
)
from datetime import datetime, timezone
import logging
import requests
from firebase_admin import storage
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# Helper function to check if user is a moderator
async def check_moderator_access(user: Dict[str, Any], db: Session) -> bool:
    """Check if the current user is a moderator."""
    user_record = db.query(User).filter(User.uid == user["uid"]).first()
    return user_record and user_record.is_moderator

class EditRawContentRequest(BaseModel):
    raw_content: str

class ModerateContentRequest(BaseModel):
    raw_content: Optional[str] = Field(None, description="Updated raw content")
    content_url: Optional[str] = Field(None, description="Updated content URL (PDF)")
    approve: bool = Field(False, description="Approve the content (change slides_pending to slides)")
    topic: Optional[str] = Field(None, description="Updated topic name")

class ModeratorProfileRequest(BaseModel):
    domains: List[str] = Field([], description="List of domains the moderator specializes in")
    topics: List[str] = Field([], description="List of topics the moderator specializes in")

class UpdateModeratorProfileRequest(BaseModel):
    domains: Optional[List[str]] = Field(None, description="Updated list of domains")
    topics: Optional[List[str]] = Field(None, description="Updated list of topics")

@router.get("/pending")
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
                    "raw_source_url": getattr(c, 'raw_source')
                }
                for c in pending_contents
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending content: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/{contentId}/raw_content")
async def get_content_raw_content(
    contentId: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves raw content for slides content. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        content = db.query(ContentItem).filter(ContentItem.id == contentId).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        if content.content_type not in ["slides", "slides_pending"]:
            raise HTTPException(status_code=400, detail="Raw content only available for slides content")
        
        raw_source_url = getattr(content, 'raw_source')
        if not raw_source_url or raw_source_url.strip() == "":
            raise HTTPException(status_code=404, detail="Raw content not found for this content")
        
        # Fetch raw content from Firebase URL
        try:
            response = requests.get(raw_source_url)
            response.raise_for_status()
            raw_content = response.text
        except Exception as e:
            logger.error(f"Error fetching raw content from URL {raw_source_url}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching raw content")

        return {
            "contentId": content.id,
            "raw_content": raw_content,
            "raw_content_url": raw_source_url,
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
        logger.error(f"Error fetching raw content for content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/{contentId}/raw_content")
async def edit_content_raw_content(
    contentId: str,
    request: EditRawContentRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Edit raw content for slides content. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        content = db.query(ContentItem).filter(ContentItem.id == contentId).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        if content.content_type not in ["slides", "slides_pending"]:
            raise HTTPException(status_code=400, detail="Raw content editing only available for slides content")
        
        # Upload updated LaTeX content to Firebase
        try:
            bucket = storage.bucket()
            # Determine the storage path based on content type
            if getattr(content, 'content_type') == "slides_pending":
                storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
            else:
                storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
            
            blob = bucket.blob(storage_path)
            blob.upload_from_string(request.raw_content, content_type="text/x-tex")
            blob.make_public()
            
            # Update the raw_source URL in database
            setattr(content, 'raw_source', blob.public_url)
            db.commit()
            
            logger.debug(f"Updated raw content for content {contentId} by moderator {user['uid']}")
            return {
                "contentId": content.id,
                "message": "Raw content updated successfully",
                "raw_content_url": blob.public_url,
                "metadata": {
                    "type": content.content_type,
                    "topic": content.topic,
                    "createdAt": content.created_at
                }
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating raw content: {str(e)}")
            raise HTTPException(status_code=500, detail="Error updating raw content")
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error editing raw content for content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/{contentId}/moderate")
async def moderate_content(
    contentId: str,
    request: ModerateContentRequest,
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
        
        # Update raw content if provided
        if request.raw_content:
            # Upload new raw content to Firebase and update URL
            try:
                bucket = storage.bucket()
                # Determine the storage path based on content type
                if getattr(content, 'content_type') == "slides_pending":
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
                else:
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
                
                blob = bucket.blob(storage_path)
                blob.upload_from_string(request.raw_content, content_type="text/x-tex")
                blob.make_public()
                setattr(content, 'raw_source', blob.public_url)
            except Exception as e:
                logger.error(f"Error uploading raw content: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading raw content")
        
        # Update content URL (PDF) if provided
        if request.content_url:
            # Validate Firebase URL
            blob = storage.bucket().blob(request.content_url.replace(f"https://storage.googleapis.com/{storage.bucket().name}/", ""))
            if blob.exists():
                setattr(content, 'content_url', request.content_url)
            else:
                raise HTTPException(status_code=400, detail="Invalid content_url")
        
        # Approve content if requested
        if request.approve:
            if getattr(content, 'content_type') == "slides_pending":
                setattr(content, 'content_type', "slides")
        
        # Update topic if provided
        if request.topic:
            setattr(content, 'topic', request.topic)

        db.commit()
        logger.debug(f"Moderated content {contentId} by moderator {user['uid']}")
        return {
            "contentId": content.id,
            "message": "Content moderated successfully",
            "metadata": {
                "type": getattr(content, 'content_type'),
                "topic": getattr(content, 'topic'),
                "createdAt": content.created_at,
                "approved": getattr(content, 'content_type') == "slides"
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating content {contentId}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error moderating content")

@router.get("/all")
async def get_all_content_for_moderation(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Lists all content (for moderation overview). Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        all_contents = db.query(ContentItem).all()
        return {
            "all_contents": [
                {
                    "contentId": c.id,
                    "topic": c.topic,
                    "type": c.content_type,
                    "user_id": c.user_id,
                    "createdAt": c.created_at,
                    "content_url": c.content_url,
                    "raw_source_url": getattr(c, 'raw_source', None)
                }
                for c in all_contents
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching all content: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.post("/profile")
async def create_moderator_profile(
    request: ModeratorProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a moderator profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Check if profile already exists
        existing_profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == user["uid"]
        ).first()
        if existing_profile:
            raise HTTPException(status_code=400, detail="Moderator profile already exists")
        
        # Create profile
        profile = ModeratorProfile(moderator_id=user["uid"])
        db.add(profile)
        
        # Add domains
        for domain in request.domains:
            domain_entry = ModeratorDomain(moderator_id=user["uid"], domain=domain)
            db.add(domain_entry)
        
        # Add topics
        for topic in request.topics:
            topic_entry = ModeratorTopic(moderator_id=user["uid"], topic=topic)
            db.add(topic_entry)
        
        db.commit()
        logger.debug(f"Created moderator profile for {user['uid']}")
        
        return {
            "message": "Moderator profile created successfully",
            "moderator_id": user["uid"],
            "domains": request.domains,
            "topics": request.topics
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating moderator profile")

@router.get("/profile")
async def get_moderator_profile(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get moderator profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == user["uid"]
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Get domains
        domains = db.query(ModeratorDomain).filter(
            ModeratorDomain.moderator_id == user["uid"]
        ).all()
        
        # Get topics
        topics = db.query(ModeratorTopic).filter(
            ModeratorTopic.moderator_id == user["uid"]
        ).all()
        
        return {
            "moderator_id": profile.moderator_id,
            "contents_modified": profile.contents_modified,
            "quizzes_modified": profile.quizzes_modified,
            "total_time_spent": float(getattr(profile, 'total_time_spent') or 0),
            "domains": [d.domain for d in domains],
            "topics": [t.topic for t in topics]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching moderator profile")

@router.put("/profile")
async def update_moderator_profile(
    request: UpdateModeratorProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update moderator profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == user["uid"]
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Update domains if provided
        if request.domains is not None:
            # Delete existing domains
            db.query(ModeratorDomain).filter(
                ModeratorDomain.moderator_id == user["uid"]
            ).delete()
            
            # Add new domains
            for domain in request.domains:
                domain_entry = ModeratorDomain(moderator_id=user["uid"], domain=domain)
                db.add(domain_entry)
        
        # Update topics if provided
        if request.topics is not None:
            # Delete existing topics
            db.query(ModeratorTopic).filter(
                ModeratorTopic.moderator_id == user["uid"]
            ).delete()
            
            # Add new topics
            for topic in request.topics:
                topic_entry = ModeratorTopic(moderator_id=user["uid"], topic=topic)
                db.add(topic_entry)
        
        db.commit()
        logger.debug(f"Updated moderator profile for {user['uid']}")
        
        return {
            "message": "Moderator profile updated successfully",
            "moderator_id": user["uid"]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating moderator profile")

@router.get("/stats")
async def get_moderator_stats(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get moderator statistics. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == user["uid"]
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Get content modification history (recent 10)
        content_history = db.query(ModeratorContentHistory).filter(
            ModeratorContentHistory.moderator_id == user["uid"]
        ).order_by(ModeratorContentHistory.modified_at.desc()).limit(10).all()
        
        # Get quiz modification history (recent 10)
        quiz_history = db.query(ModeratorQuizHistory).filter(
            ModeratorQuizHistory.moderator_id == user["uid"]
        ).order_by(ModeratorQuizHistory.modified_at.desc()).limit(10).all()
        
        return {
            "moderator_id": profile.moderator_id,
            "contents_modified": profile.contents_modified,
            "quizzes_modified": profile.quizzes_modified,
            "total_time_spent": float(getattr(profile, 'total_time_spent') or 0),
            "recent_content_modifications": [
                {
                    "content_id": str(h.content_id),
                    "modified_at": h.modified_at
                }
                for h in content_history
            ],
            "recent_quiz_modifications": [
                {
                    "quiz_id": str(h.quiz_id),
                    "modified_at": h.modified_at
                }
                for h in quiz_history
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching moderator stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching moderator stats")
