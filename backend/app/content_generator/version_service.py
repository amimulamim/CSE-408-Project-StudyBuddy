from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from app.content_generator.models import ContentItem, ContentModification
from app.content_generator.content_generator import ContentGenerator
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ContentVersionService:
    """Service for managing content versions and modifications."""
    
    def __init__(self):
        self.content_generator = ContentGenerator()
    
    async def modify_content(
        self,
        content_id: str,
        user_id: str,
        modification_instructions: str,
        source_version: Optional[int] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Create a modified version of existing content.
        
        Args:
            content_id: ID of the content to modify
            user_id: User requesting the modification
            modification_instructions: Instructions for modification
            source_version: Specific version to modify from (defaults to latest)
            db: Database session
            
        Returns:
            Dict containing the new content version details
        """
        try:
            # Get the source content
            if source_version:
                source_content = db.query(ContentItem).filter(
                    ContentItem.user_id == user_id,
                    ContentItem.parent_content_id == content_id,
                    ContentItem.version_number == source_version
                ).first()
                
                if not source_content:
                    # Check if it's the original content
                    source_content = db.query(ContentItem).filter(
                        ContentItem.id == content_id,
                        ContentItem.user_id == user_id,
                        ContentItem.version_number == source_version
                    ).first()
            else:
                # Get latest version
                source_content = db.query(ContentItem).filter(
                    ContentItem.user_id == user_id,
                    ContentItem.is_latest_version == True
                ).filter(
                    (ContentItem.id == content_id) | 
                    (ContentItem.parent_content_id == content_id)
                ).first()
            
            if not source_content:
                raise ValueError("Source content not found")
            
            # Find the root content ID (for versioning)
            root_content_id = source_content.parent_content_id or source_content.id
            
            # Generate new content ID
            new_content_id = str(uuid.uuid4())
            
            # Create modification record
            modification = ContentModification(
                content_id=new_content_id,
                modification_instructions=modification_instructions
            )
            db.add(modification)
            db.flush()  # Get the modification ID
            
            # Prepare modified instructions for content generation
            combined_instructions = f"""
            MODIFICATION REQUEST based on existing content:
            Original Topic: {source_content.topic}
            Content Type: {source_content.content_type}
            
            USER MODIFICATION INSTRUCTIONS:
            {modification_instructions}
            
            Please modify the content according to these instructions while maintaining the core educational value and structure.
            """
            
            # Generate modified content using the content generator
            await self.content_generator.generate_and_store_content(
                content_id=new_content_id,
                user_id=user_id,
                content_type=source_content.content_type,
                topic=source_content.topic,
                difficulty="medium",  # Use default values for modification
                length="medium",
                tone="instructive",
                collection_name=source_content.collection_name,
                full_collection_name=source_content.collection_name,
                special_instructions=combined_instructions,
                db=db
            )
            
            # Update the newly created content item with versioning info
            new_content = db.query(ContentItem).filter(ContentItem.id == new_content_id).first()
            if new_content:
                new_content.parent_content_id = root_content_id
                new_content.modification_instructions = modification_instructions
                new_content.modified_from_version = source_content.version_number
                
                db.commit()
                
                return {
                    "new_content_id": new_content_id,
                    "version_number": new_content.version_number,
                    "parent_content_id": str(root_content_id),
                    "modification_id": str(modification.id),
                    "status": "completed"
                }
            else:
                raise RuntimeError("Failed to create modified content")
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error modifying content {content_id}: {str(e)}")
            raise
    
    def get_content_versions(
        self,
        content_id: str,
        user_id: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        Get all versions of a content item.
        
        Args:
            content_id: ID of the content (any version)
            user_id: User ID for access control
            db: Database session
            
        Returns:
            List of content versions with metadata
        """
        try:
            # Use the PostgreSQL function to get all versions
            result = db.execute(
                text("SELECT * FROM get_content_versions(:content_id)"),
                {"content_id": content_id}
            )
            
            versions = []
            for row in result:
                # Verify user access
                content_check = db.query(ContentItem).filter(
                    ContentItem.id == row.id,
                    ContentItem.user_id == user_id
                ).first()
                
                if content_check:
                    versions.append({
                        "id": str(row.id),
                        "version_number": row.version_number,
                        "content_url": row.content_url,
                        "topic": row.topic,
                        "content_type": row.content_type,
                        "modification_instructions": row.modification_instructions,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                        "is_latest_version": row.is_latest_version
                    })
            
            # Sort by version number
            versions.sort(key=lambda x: x["version_number"])
            return versions
            
        except Exception as e:
            logger.error(f"Error getting content versions for {content_id}: {str(e)}")
            raise
    
    def get_modification_history(
        self,
        content_id: str,
        user_id: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        Get modification history for a content item.
        
        Args:
            content_id: Root content ID
            user_id: User ID for access control
            db: Database session
            
        Returns:
            List of modifications with details
        """
        try:
            # Use the PostgreSQL function to get modification history
            result = db.execute(
                text("SELECT * FROM get_modification_history(:content_id)"),
                {"content_id": content_id}
            )
            
            modifications = []
            for row in result:
                # Verify user access by checking if the content belongs to the user
                content_check = db.query(ContentItem).filter(
                    ContentItem.id == row.content_id,
                    ContentItem.user_id == user_id
                ).first()
                
                if content_check:
                    modifications.append({
                        "id": str(row.id),
                        "content_id": str(row.content_id),
                        "modification_instructions": row.modification_instructions,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                        "content_topic": row.content_topic,
                        "version_number": row.version_number
                    })
            
            return modifications
            
        except Exception as e:
            logger.error(f"Error getting modification history for {content_id}: {str(e)}")
            raise
    
    def delete_content_version(
        self,
        content_id: str,
        version_number: int,
        user_id: str,
        db: Session
    ) -> bool:
        """
        Delete a specific version of content.
        Note: Cannot delete the original version if it has child versions.
        
        Args:
            content_id: Root content ID
            version_number: Version to delete
            user_id: User ID for access control
            db: Database session
            
        Returns:
            True if successful
        """
        try:
            # Find the content version
            if version_number == 1:
                # Original version
                content = db.query(ContentItem).filter(
                    ContentItem.id == content_id,
                    ContentItem.user_id == user_id,
                    ContentItem.version_number == 1
                ).first()
                
                # Check if it has child versions
                child_count = db.query(ContentItem).filter(
                    ContentItem.parent_content_id == content_id
                ).count()
                
                if child_count > 0:
                    raise ValueError("Cannot delete original version with existing modifications")
            else:
                # Modified version
                content = db.query(ContentItem).filter(
                    ContentItem.parent_content_id == content_id,
                    ContentItem.version_number == version_number,
                    ContentItem.user_id == user_id
                ).first()
            
            if not content:
                raise ValueError("Content version not found")
            
            # If this was the latest version, mark the previous version as latest
            if content.is_latest_version:
                previous_version = db.query(ContentItem).filter(
                    (ContentItem.id == content_id) | (ContentItem.parent_content_id == content_id),
                    ContentItem.version_number < version_number,
                    ContentItem.user_id == user_id
                ).order_by(desc(ContentItem.version_number)).first()
                
                if previous_version:
                    previous_version.is_latest_version = True
            
            # Delete the content
            db.delete(content)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting content version {content_id}:{version_number}: {str(e)}")
            raise
