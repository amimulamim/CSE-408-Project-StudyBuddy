from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.auth.firebase_auth import get_current_user
from app.content_generator.models import ContentItem
from app.quiz_generator.models import Quiz
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
import asyncio
import subprocess
import tempfile
import time
import os
from firebase_admin import storage
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# LaTeX compilation function
async def compile_latex_to_pdf(latex_content: str, topic: str) -> bytes:
    """Compile LaTeX content to PDF and return PDF bytes."""
    try:
        # Compile LaTeX to PDF without adding any preamble
        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = os.path.join(tmpdir, "slides.tex")
            pdf_path = os.path.join(tmpdir, "slides.pdf")
            
            with open(tex_path, "w", encoding="utf-8") as f:
                f.write(latex_content)
                
            proc = await asyncio.to_thread(
                subprocess.run,
                ["pdflatex", "-interaction=nonstopmode", tex_path],
                cwd=tmpdir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30
            )
            
            if proc.returncode == 0 and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as pdf_file:
                    return pdf_file.read()
            else:
                error_msg = proc.stderr.decode('utf-8') if proc.stderr else "Unknown compilation error"
                logger.error(f"LaTeX compilation failed: {error_msg}")
                raise Exception(f"LaTeX compilation failed: {error_msg}")
                
    except Exception as e:
        logger.error(f"Error compiling LaTeX: {str(e)}")
        raise Exception(f"Error compiling LaTeX: {str(e)}")

# Helper function to track moderation activity
async def track_moderation_activity(
    moderator_id: str, 
    db: Session,
    content_id: Optional[str] = None, 
    quiz_id: Optional[str] = None
) -> None:
    """Track moderator activity and update profile counts."""
    try:
        # Get or create moderator profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == moderator_id
        ).first()
        
        if not profile:
            # Create profile if it doesn't exist
            profile = ModeratorProfile(moderator_id=moderator_id)
            db.add(profile)
            # Flush to make the profile available for foreign key references
            db.flush()
        
        # Log activity and increment counters
        if content_id:
            # Log content moderation
            content_history = ModeratorContentHistory(
                moderator_id=moderator_id,
                content_id=content_id
            )
            db.add(content_history)
            
            # Increment content count
            current_count = getattr(profile, 'contents_modified') or 0
            setattr(profile, 'contents_modified', current_count + 1)
            
        if quiz_id:
            # Log quiz moderation  
            quiz_history = ModeratorQuizHistory(
                moderator_id=moderator_id,
                quiz_id=quiz_id
            )
            db.add(quiz_history)
            
            # Increment quiz count
            current_count = getattr(profile, 'quizzes_modified') or 0
            setattr(profile, 'quizzes_modified', current_count + 1)
        
        db.commit()
        logger.debug(f"Tracked moderation activity for moderator {moderator_id}")
        
    except Exception as e:
        logger.error(f"Error tracking moderation activity: {str(e)}")
        db.rollback()
        # Don't raise exception as this is a secondary concern

# Helper function to check if user is a moderator
async def check_moderator_access(user: Dict[str, Any], db: Session) -> bool:
    """Check if the current user is a moderator."""
    user_record = db.query(User).filter(User.uid == user["uid"]).first()
    return user_record and user_record.is_moderator

class EditRawContentRequest(BaseModel):
    raw_content: str
    content_url: Optional[str] = Field(None, description="Custom URL to save the compiled PDF (if not provided, uses previous URL)")

class ModerateContentRequest(BaseModel):
    raw_content: Optional[str] = Field(None, description="Updated raw content")
    content_url: Optional[str] = Field(None, description="Custom URL to save the compiled PDF (if not provided, uses previous URL)")
    approve: bool = Field(False, description="Approve the content (change slides_pending to slides)")
    topic: Optional[str] = Field(None, description="Updated topic name")

class ModeratorProfileRequest(BaseModel):
    moderator_id: Optional[str] = Field(None, description="Target moderator ID (if not provided, creates profile for current user)")
    domains: List[str] = Field([], description="List of domains the moderator specializes in")
    topics: List[str] = Field([], description="List of topics the moderator specializes in")

class UpdateModeratorProfileRequest(BaseModel):
    domains: Optional[List[str]] = Field(None, description="Updated list of domains")
    topics: Optional[List[str]] = Field(None, description="Updated list of topics")

# Quiz Moderation Endpoints

class ModerateQuizRequest(BaseModel):
    topic: Optional[str] = Field(None, description="Updated topic name")
    domain: Optional[str] = Field(None, description="Updated domain name")
    approve: bool = Field(False, description="Approve the quiz")

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
            raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

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
            
            # Use existing raw_source path from database if it exists, otherwise generate new path
            existing_raw_source = getattr(content, 'raw_source', None)
            if existing_raw_source:
                # Extract storage path from existing URL
                storage_path = existing_raw_source.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                logger.debug(f"Using existing raw_source path from DB: {storage_path}")
            else:
                # Generate new path if no existing raw_source
                if getattr(content, 'content_type') == "slides_pending":
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
                else:
                    storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
                logger.debug(f"No existing raw_source, using new path: {storage_path}")
            
            # Determine PDF storage path
            if request.content_url:
                # Use provided custom URL path
                pdf_storage_path = request.content_url.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                if not pdf_storage_path.endswith('.pdf'):
                    pdf_storage_path = pdf_storage_path + ".pdf"
            else:
                # Use existing content_url from database if it exists
                existing_content_url = getattr(content, 'content_url', None)
                if existing_content_url:
                    pdf_storage_path = existing_content_url.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                    logger.debug(f"Using existing content_url from DB: {existing_content_url}")
                    logger.debug(f"Extracted PDF storage path: {pdf_storage_path}")
                else:
                    # Fallback to default path if no existing URL
                    if getattr(content, 'content_type') == "slides_pending":
                        pdf_storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.pdf"
                    else:
                        pdf_storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.pdf"
                    logger.debug(f"No existing content_url, using default path: {pdf_storage_path}")
            
            # Upload LaTeX source
            blob = bucket.blob(storage_path)
            
            # Set cache control headers to prevent aggressive caching
            blob.metadata = {
                'Cache-Control': 'no-cache, must-revalidate',
                'Last-Modified': str(int(time.time()))
            }
            
            blob.upload_from_string(request.raw_content, content_type="text/x-tex")
            blob.make_public()
            
            # Add cache-busting timestamp to the URL to ensure fresh raw content loads
            cache_buster = str(int(time.time()))
            raw_url_with_cache_buster = f"{blob.public_url}?v={cache_buster}&updated={cache_buster}"
            
            # Update the raw_source URL in database (with cache buster)
            setattr(content, 'raw_source', raw_url_with_cache_buster)
            
            # Initialize compilation success flag
            compilation_successful = False
            
            # Compile LaTeX to PDF and upload
            try:
                pdf_bytes = await compile_latex_to_pdf(request.raw_content, getattr(content, 'topic'))
                
                # Upload PDF to Firebase at the determined path
                pdf_blob = bucket.blob(pdf_storage_path)
                
                # Set cache control headers to prevent aggressive caching
                pdf_blob.metadata = {
                    'Cache-Control': 'no-cache, must-revalidate',
                    'Last-Modified': str(int(time.time()))
                }
                
                pdf_blob.upload_from_string(pdf_bytes, content_type="application/pdf")
                pdf_blob.make_public()
                
                # Add cache-busting timestamp to the URL to ensure fresh PDF loads
                cache_buster = str(int(time.time()))
                pdf_url_with_cache_buster = f"{pdf_blob.public_url}?v={cache_buster}&updated={cache_buster}"
                
                # Update content_url with compiled PDF (including cache buster)
                setattr(content, 'content_url', pdf_url_with_cache_buster)
                compilation_successful = True
                
                logger.debug(f"Successfully compiled and uploaded PDF for content {contentId} with cache buster")
                
            except Exception as compile_error:
                logger.warning(f"LaTeX compilation failed for content {contentId}: {str(compile_error)}")
                # Continue without updating content_url if compilation fails
                # The raw content is still saved for future attempts
            
            # Only remove pending state if compilation was successful
            if compilation_successful and getattr(content, 'content_type') == "slides_pending":
                setattr(content, 'content_type', "slides")
                logger.debug(f"Changed content {contentId} from slides_pending to slides after successful compilation")
            
            db.commit()
            
            # Track moderation activity
            await track_moderation_activity(
                moderator_id=user['uid'],
                db=db,
                content_id=contentId
            )
            
            logger.debug(f"Updated raw content for content {contentId} by moderator {user['uid']}")
            
            response_data = {
                "contentId": content.id,
                "message": "Raw content updated successfully",
                "raw_content_url": blob.public_url,
                "compilation_successful": compilation_successful,
                "metadata": {
                    "type": content.content_type,
                    "topic": content.topic,
                    "createdAt": content.created_at
                }
            }
            
            # Add PDF URL if compilation was successful
            if compilation_successful and hasattr(content, 'content_url') and getattr(content, 'content_url'):
                response_data["compiled_pdf_url"] = getattr(content, 'content_url')
                response_data["message"] = "Raw content updated and compiled successfully"
            elif not compilation_successful:
                response_data["message"] = "Raw content updated but compilation failed"
            
            return response_data
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating raw content: {str(e)}")
            raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")
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
        compilation_successful = True  # Default to true for cases where no compilation is needed
        
        if request.raw_content:
            # Upload new raw content to Firebase and update URL
            try:
                bucket = storage.bucket()
                
                # Use existing raw_source path from database if it exists, otherwise generate new path
                existing_raw_source = getattr(content, 'raw_source', None)
                if existing_raw_source:
                    # Extract storage path from existing URL
                    storage_path = existing_raw_source.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                    logger.debug(f"Using existing raw_source path from DB: {storage_path}")
                else:
                    # Generate new path if no existing raw_source
                    if getattr(content, 'content_type') == "slides_pending":
                        storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.tex"
                    else:
                        storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.tex"
                    logger.debug(f"No existing raw_source, using new path: {storage_path}")
                
                # Determine PDF storage path
                if request.content_url:
                    # Use provided custom URL path
                    pdf_storage_path = request.content_url.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                    if not pdf_storage_path.endswith('.pdf'):
                        pdf_storage_path = pdf_storage_path + ".pdf"
                else:
                    # Use existing content_url from database if it exists
                    existing_content_url = getattr(content, 'content_url', None)
                    if existing_content_url:
                        pdf_storage_path = existing_content_url.replace(f"https://storage.googleapis.com/{bucket.name}/", "")
                    else:
                        # Fallback to default path if no existing URL
                        if getattr(content, 'content_type') == "slides_pending":
                            pdf_storage_path = f"content/{getattr(content, 'user_id')}/{contentId}_pending.pdf"
                        else:
                            pdf_storage_path = f"content/{getattr(content, 'user_id')}/{contentId}.pdf"
                
                # Upload LaTeX source
                blob = bucket.blob(storage_path)
                
                # Set cache control headers to prevent aggressive caching
                blob.metadata = {
                    'Cache-Control': 'no-cache, must-revalidate',
                    'Last-Modified': str(int(time.time()))
                }
                
                blob.upload_from_string(request.raw_content, content_type="text/x-tex")
                blob.make_public()
                
                # Add cache-busting timestamp to the raw content URL to ensure fresh file loads
                cache_buster = str(int(time.time()))
                raw_url_with_cache_buster = f"{blob.public_url}?v={cache_buster}&updated={cache_buster}"
                
                # Update the raw_source URL in database (with cache buster)
                setattr(content, 'raw_source', raw_url_with_cache_buster)
                
                # Initialize compilation success flag
                compilation_successful = False
                
                # Compile LaTeX to PDF and upload
                try:
                    pdf_bytes = await compile_latex_to_pdf(request.raw_content, getattr(content, 'topic'))
                    
                    # Upload PDF to Firebase at the determined path
                    pdf_blob = bucket.blob(pdf_storage_path)
                    
                    # Set cache control headers to prevent aggressive caching
                    pdf_blob.metadata = {
                        'Cache-Control': 'no-cache, must-revalidate',
                        'Last-Modified': str(int(time.time()))
                    }
                    
                    pdf_blob.upload_from_string(pdf_bytes, content_type="application/pdf")
                    pdf_blob.make_public()
                    
                    # Add cache-busting timestamp to the URL to ensure fresh PDF loads
                    cache_buster = str(int(time.time()))
                    pdf_url_with_cache_buster = f"{pdf_blob.public_url}?v={cache_buster}&updated={cache_buster}"
                    
                    # Update content_url with compiled PDF (including cache buster)
                    setattr(content, 'content_url', pdf_url_with_cache_buster)
                    compilation_successful = True
                    
                    logger.debug(f"Successfully compiled and uploaded PDF for content {contentId}")
                    
                except Exception as compile_error:
                    logger.warning(f"LaTeX compilation failed for content {contentId}: {str(compile_error)}")
                    # Continue without updating content_url if compilation fails
                
            except Exception as e:
                logger.error(f"Error uploading raw content: {str(e)}")
                raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")
        
        # Update content URL (PDF) if provided and no raw_content was processed
        elif request.content_url:
            # If it's a Firebase URL, validate it and use it directly
            if request.content_url.startswith(f"https://storage.googleapis.com/{storage.bucket().name}/"):
                setattr(content, 'content_url', request.content_url)
            else:
                raise HTTPException(status_code=400, detail="Invalid content_url format. Must be a Firebase Storage URL.")
        
        # Approve content if requested OR if raw content was successfully compiled
        should_approve = request.approve or (request.raw_content and compilation_successful)
        if should_approve and getattr(content, 'content_type') == "slides_pending":
            setattr(content, 'content_type', "slides")
            logger.debug(f"Changed content {contentId} from slides_pending to slides")
        
        # Update topic if provided
        if request.topic:
            setattr(content, 'topic', request.topic)

        db.commit()
        
        # Track moderation activity
        await track_moderation_activity(
            moderator_id=user['uid'],
            db=db,
            content_id=contentId
        )
        
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
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

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
        
        # Determine target moderator ID
        target_moderator_id = request.moderator_id if request.moderator_id else user["uid"]
        
        # If creating profile for another user, verify that user exists and is a moderator
        if request.moderator_id and request.moderator_id != user["uid"]:
            target_user = db.query(User).filter(User.uid == request.moderator_id).first()
            if not target_user:
                raise HTTPException(status_code=404, detail="Target user not found")
            if not getattr(target_user, 'is_moderator', False):
                raise HTTPException(status_code=400, detail="Target user is not a moderator")
        
        # Check if profile already exists
        existing_profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == target_moderator_id
        ).first()
        if existing_profile:
            raise HTTPException(status_code=400, detail="Moderator profile already exists for this user")
        
        # Create profile
        profile = ModeratorProfile(moderator_id=target_moderator_id)
        db.add(profile)
        
        # Flush to get the profile inserted and available for foreign key references
        # but don't commit yet in case domains/topics fail
        db.flush()
        
        # Add domains
        for domain in request.domains:
            domain_entry = ModeratorDomain(moderator_id=target_moderator_id, domain=domain)
            db.add(domain_entry)
        
        # Add topics
        for topic in request.topics:
            topic_entry = ModeratorTopic(moderator_id=target_moderator_id, topic=topic)
            db.add(topic_entry)
        
        # Commit everything together
        db.commit()
        logger.debug(f"Created moderator profile for {target_moderator_id} by moderator {user['uid']}")
        
        return {
            "message": "Moderator profile created successfully",
            "moderator_id": target_moderator_id,
            "created_by": user["uid"],
            "domains": request.domains,
            "topics": request.topics
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/profile")
async def get_moderator_profile(
    moderator_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get moderator profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Determine target moderator ID
        target_moderator_id = moderator_id if moderator_id else user["uid"]
        
        # If getting profile for another user, verify that user exists and is a moderator
        if moderator_id and moderator_id != user["uid"]:
            target_user = db.query(User).filter(User.uid == moderator_id).first()
            if not target_user:
                raise HTTPException(status_code=404, detail="Target user not found")
            if not getattr(target_user, 'is_moderator', False):
                raise HTTPException(status_code=400, detail="Target user is not a moderator")
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == target_moderator_id
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Get domains
        domains = db.query(ModeratorDomain).filter(
            ModeratorDomain.moderator_id == target_moderator_id
        ).all()
        
        # Get topics
        topics = db.query(ModeratorTopic).filter(
            ModeratorTopic.moderator_id == target_moderator_id
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
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/profile")
async def update_moderator_profile(
    request: UpdateModeratorProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update moderator profile. Only allows updating own profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Only allow updating own profile
        target_moderator_id = user["uid"]
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == target_moderator_id
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Update domains if provided
        if request.domains is not None:
            # Delete existing domains
            db.query(ModeratorDomain).filter(
                ModeratorDomain.moderator_id == target_moderator_id
            ).delete()
            
            # Add new domains
            for domain in request.domains:
                domain_entry = ModeratorDomain(moderator_id=target_moderator_id, domain=domain)
                db.add(domain_entry)
        
        # Update topics if provided
        if request.topics is not None:
            # Delete existing topics
            db.query(ModeratorTopic).filter(
                ModeratorTopic.moderator_id == target_moderator_id
            ).delete()
            
            # Add new topics
            for topic in request.topics:
                topic_entry = ModeratorTopic(moderator_id=target_moderator_id, topic=topic)
                db.add(topic_entry)
        
        db.commit()
        logger.debug(f"Updated moderator profile for {target_moderator_id}")
        
        return {
            "message": "Moderator profile updated successfully",
            "moderator_id": target_moderator_id
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/profile/{moderator_id}")
async def update_other_moderator_profile(
    moderator_id: str,
    request: UpdateModeratorProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update another moderator's profile. Only accessible by moderators. (Reserved for future admin functionality)"""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # For now, only allow updating own profile via this endpoint too
        # This can be enhanced later with admin-level permissions
        if moderator_id != user["uid"]:
            raise HTTPException(status_code=403, detail="You can only update your own profile")
        
        # Verify that target user exists and is a moderator
        target_user = db.query(User).filter(User.uid == moderator_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        if not getattr(target_user, 'is_moderator', False):
            raise HTTPException(status_code=400, detail="Target user is not a moderator")
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == moderator_id
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Update domains if provided
        if request.domains is not None:
            # Delete existing domains
            db.query(ModeratorDomain).filter(
                ModeratorDomain.moderator_id == moderator_id
            ).delete()
            
            # Add new domains
            for domain in request.domains:
                domain_entry = ModeratorDomain(moderator_id=moderator_id, domain=domain)
                db.add(domain_entry)
        
        # Update topics if provided
        if request.topics is not None:
            # Delete existing topics
            db.query(ModeratorTopic).filter(
                ModeratorTopic.moderator_id == moderator_id
            ).delete()
            
            # Add new topics
            for topic in request.topics:
                topic_entry = ModeratorTopic(moderator_id=moderator_id, topic=topic)
                db.add(topic_entry)
        
        db.commit()
        logger.debug(f"Updated moderator profile for {moderator_id} by moderator {user['uid']}")
        
        return {
            "message": "Moderator profile updated successfully",
            "moderator_id": moderator_id,
            "updated_by": user["uid"]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

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
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/quiz/pending")
async def get_pending_quizzes(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Lists all quizzes pending moderation. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Assuming pending quizzes have a specific status or field
        # This would need to be adjusted based on your actual quiz status implementation
        pending_quizzes = db.query(Quiz).all()  # Modify this query as needed
        
        return {
            "pending_quizzes": [
                {
                    "quizId": str(q.quiz_id),
                    "topic": q.topic,
                    "domain": q.domain,
                    "user_id": q.user_id,
                    "createdAt": q.created_at,
                    "difficulty": getattr(q, 'difficulty').value if getattr(q, 'difficulty') else None
                }
                for q in pending_quizzes
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending quizzes: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.put("/quiz/{quizId}/moderate")
async def moderate_quiz(
    quizId: str,
    request: ModerateQuizRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Allows moderators to update and approve quizzes."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        quiz = db.query(Quiz).filter(Quiz.quiz_id == quizId).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        # Update topic if provided
        if request.topic:
            setattr(quiz, 'topic', request.topic)
        
        # Update domain if provided
        if request.domain:
            setattr(quiz, 'domain', request.domain)
        
        # Handle approval logic (modify as needed based on your quiz status implementation)
        if request.approve:
            # Add any approval logic here if needed
            pass
        
        db.commit()
        
        # Track moderation activity
        await track_moderation_activity(
            moderator_id=user['uid'],
            db=db,
            quiz_id=quizId
        )
        
        logger.debug(f"Moderated quiz {quizId} by moderator {user['uid']}")
        
        return {
            "quizId": str(quiz.quiz_id),
            "message": "Quiz moderated successfully",
            "metadata": {
                "topic": quiz.topic,
                "domain": quiz.domain,
                "createdAt": quiz.created_at,
                "approved": request.approve
            }
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating quiz {quizId}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/quiz/all")
async def get_all_quizzes_for_moderation(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Lists all quizzes for moderation overview. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        all_quizzes = db.query(Quiz).all()
        return {
            "all_quizzes": [
                {
                    "quizId": str(q.quiz_id),
                    "topic": q.topic,
                    "domain": q.domain,
                    "user_id": q.user_id,
                    "createdAt": q.created_at,
                    "difficulty": getattr(q, 'difficulty').value if getattr(q, 'difficulty') else None,
                    "duration": q.duration
                }
                for q in all_quizzes
            ]
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching all quizzes: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/profiles/all")
async def get_all_moderator_profiles(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all moderator profiles. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Get all moderator profiles
        profiles = db.query(ModeratorProfile).all()
        
        result_profiles = []
        for profile in profiles:
            # Get domains for this moderator
            domains = db.query(ModeratorDomain).filter(
                ModeratorDomain.moderator_id == profile.moderator_id
            ).all()
            
            # Get topics for this moderator
            topics = db.query(ModeratorTopic).filter(
                ModeratorTopic.moderator_id == profile.moderator_id
            ).all()
            
            # Get user info
            user_info = db.query(User).filter(User.uid == profile.moderator_id).first()
            
            result_profiles.append({
                "moderator_id": profile.moderator_id,
                "user_email": getattr(user_info, 'email', None) if user_info else None,
                "contents_modified": profile.contents_modified,
                "quizzes_modified": profile.quizzes_modified,
                "total_time_spent": float(getattr(profile, 'total_time_spent') or 0),
                "domains": [d.domain for d in domains],
                "topics": [t.topic for t in topics],
                "profile_created_at": getattr(profile, 'created_at', None)
            })
        
        return {
            "moderator_profiles": result_profiles,
            "total_count": len(result_profiles)
        }
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error fetching all moderator profiles: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.delete("/profile")
async def delete_moderator_profile(
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete moderator profile. Only allows deleting own profile. Only accessible by moderators."""
    try:
        # Check if user is a moderator
        if not await check_moderator_access(user, db):
            raise HTTPException(status_code=403, detail="Access denied. Moderator privileges required.")
        
        # Only allow deleting own profile
        target_moderator_id = user["uid"]
        
        # Get profile
        profile = db.query(ModeratorProfile).filter(
            ModeratorProfile.moderator_id == target_moderator_id
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Moderator profile not found")
        
        # Delete associated domains
        db.query(ModeratorDomain).filter(
            ModeratorDomain.moderator_id == target_moderator_id
        ).delete()
        
        # Delete associated topics
        db.query(ModeratorTopic).filter(
            ModeratorTopic.moderator_id == target_moderator_id
        ).delete()
        
        # Delete history records (optional - you might want to keep these for audit purposes)
        # db.query(ModeratorContentHistory).filter(
        #     ModeratorContentHistory.moderator_id == target_moderator_id
        # ).delete()
        # 
        # db.query(ModeratorQuizHistory).filter(
        #     ModeratorQuizHistory.moderator_id == target_moderator_id
        # ).delete()
        
        # Delete the profile
        db.delete(profile)
        
        db.commit()
        logger.debug(f"Deleted moderator profile for {target_moderator_id}")
        
        return {
            "message": "Moderator profile deleted successfully",
            "moderator_id": target_moderator_id
        }
    except HTTPException as e:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting moderator profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")
