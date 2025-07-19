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
            source_content = None
            
            if source_version:
                # First, try to find the specific version in the version chain
                source_content = db.query(ContentItem).filter(
                    ContentItem.user_id == user_id,
                    ContentItem.version_number == source_version
                ).filter(
                    (ContentItem.id == content_id) | 
                    (ContentItem.parent_content_id == content_id)
                ).first()
                
                # If not found, check if the content_id itself is the version we want
                if not source_content:
                    source_content = db.query(ContentItem).filter(
                        ContentItem.id == content_id,
                        ContentItem.user_id == user_id
                    ).first()
                    
                    # Verify it's the right version or find the right version in the chain
                    if source_content and source_content.version_number != source_version:
                        # Look for the specific version in the entire chain
                        root_id = source_content.parent_content_id or source_content.id
                        source_content = db.query(ContentItem).filter(
                            ContentItem.user_id == user_id,
                            ContentItem.version_number == source_version
                        ).filter(
                            (ContentItem.id == root_id) | 
                            (ContentItem.parent_content_id == root_id)
                        ).first()
            else:
                # Get latest version - find any content in the chain and then get the latest
                any_content = db.query(ContentItem).filter(
                    (ContentItem.id == content_id) | 
                    (ContentItem.parent_content_id == content_id),
                    ContentItem.user_id == user_id
                ).first()
                
                if any_content:
                    root_id = any_content.parent_content_id or any_content.id
                    source_content = db.query(ContentItem).filter(
                        ContentItem.user_id == user_id,
                        ContentItem.is_latest_version == True
                    ).filter(
                        (ContentItem.id == root_id) | 
                        (ContentItem.parent_content_id == root_id)
                    ).first()
            
            if not source_content:
                logger.error(f"Could not find source content for content_id: {content_id}, user_id: {user_id}, source_version: {source_version}")
                raise ValueError("Source content not found")
            
            # Find the root content ID (for versioning)
            root_content_id = source_content.parent_content_id or source_content.id
            
            # Generate new content ID
            new_content_id = str(uuid.uuid4())
            
            # Retrieve relevant documents from vector database for enhanced context
            rag_context = ""
            try:
                # Create an enhanced search query that combines the original topic with modification intent
                search_query = f"{source_content.topic}"
                
                # Extract key terms from modification instructions to enhance the search
                mod_keywords = []
                mod_lower = modification_instructions.lower()
                
                # Look for specific technical terms or concepts
                technical_terms = ["example", "code", "sample", "tutorial", "guide", "implementation", 
                                 "python", "javascript", "react", "node", "docker", "ci/cd", "pipeline",
                                 "testing", "deployment", "database", "api", "authentication", "security"]
                
                for term in technical_terms:
                    if term in mod_lower:
                        mod_keywords.append(term)
                
                # Add modification keywords to search query
                if mod_keywords:
                    search_query += f" {' '.join(mod_keywords)}"
                
                logger.info(f"Enhanced RAG query: '{search_query}'")
                
                documents = await self.content_generator.document_service.search_documents(
                    query=search_query,
                    user_id=user_id,
                    collection_name=source_content.collection_name,
                    limit=7  # Increased limit for more comprehensive context
                )
                if documents:
                    rag_context = "\n\n".join([f"[Document {i+1}]\n{doc['content']}" for i, doc in enumerate(documents)])
                    logger.info(f"Retrieved {len(documents)} documents for enhanced content generation")
                else:
                    # Fallback: try searching with just the original topic
                    logger.warning(f"No RAG documents found for enhanced query: {search_query}, trying fallback")
                    fallback_documents = await self.content_generator.document_service.search_documents(
                        query=source_content.topic,
                        user_id=user_id,
                        collection_name=source_content.collection_name,
                        limit=5
                    )
                    if fallback_documents:
                        rag_context = "\n\n".join([f"[Document {i+1}]\n{doc['content']}" for i, doc in enumerate(fallback_documents)])
                        logger.info(f"Fallback retrieved {len(fallback_documents)} documents")
                    else:
                        logger.warning("No RAG documents found even with fallback query")
            except Exception as e:
                logger.warning(f"Could not retrieve RAG context: {str(e)}")
            
            # Prepare modified instructions for content generation
            # Fetch the actual content from the source to provide context
            source_content_text = ""
            try:
                import requests
                if source_content.content_url:
                    response = requests.get(source_content.content_url, timeout=30)
                    if response.status_code == 200:
                        if source_content.content_type == "flashcards":
                            # For flashcards, get the JSON content
                            source_content_text = f"EXISTING FLASHCARDS:\n{response.text}"
                        else:
                            # For slides, we can't easily extract text, so provide a note
                            source_content_text = f"EXISTING CONTENT: {source_content.content_type} presentation available at {source_content.content_url}"
            except Exception as e:
                logger.warning(f"Could not fetch source content: {str(e)}")
                source_content_text = f"EXISTING CONTENT: {source_content.content_type} on topic '{source_content.topic}'"
            
            combined_instructions = f"""
            ENHANCEMENT REQUEST - Build upon and improve existing content:
            
            {source_content_text}
            
            RELEVANT KNOWLEDGE BASE CONTEXT:
            {rag_context}
            
            Original Topic: {source_content.topic}
            Content Type: {source_content.content_type}
            
            USER MODIFICATION INSTRUCTIONS:
            {modification_instructions}
            
            IMPORTANT GUIDELINES:
            1. ENHANCE and BUILD UPON the existing content - do not replace or remove existing valuable content unless explicitly instructed
            2. ADD the requested elements while KEEPING all existing quality content
            3. Use the KNOWLEDGE BASE CONTEXT above to provide accurate, detailed, and up-to-date information
            4. If the existing content already has good examples, keep them and add more if requested, drawing from the knowledge base
            5. Only REMOVE something if the user explicitly asks to exclude or remove that (make sure you removed something the user explicitly asked to remove)
            6. Make sure you remove any conflicting or redundant content that does not align with the new instructions
            7. The goal is to make the content MORE comprehensive and valuable, leveraging both existing content and knowledge base
            8. Maintain consistency with the existing style and educational approach
            9. If adding examples (like cd.yml), include them as ADDITIONAL content alongside existing material, ensuring accuracy with knowledge base
            10. Cross-reference the knowledge base to ensure all technical details, code examples, and explanations are current and correct

            Please enhance the content according to these instructions while preserving and building upon the existing educational value and structure, enriched with knowledge base context.
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
                
                # Create modification record after content is created
                modification = ContentModification(
                    content_id=new_content_id,
                    modification_instructions=modification_instructions
                )
                db.add(modification)
                db.flush()  # Get the modification ID
                
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
            content_id: Root content ID or any version ID
            user_id: User ID for access control
            db: Database session
            
        Returns:
            List of modifications with details
        """
        try:
            # First, find the root content ID by checking if this content has a parent
            root_content_id = content_id
            content_check = db.query(ContentItem).filter(
                ContentItem.id == content_id,
                ContentItem.user_id == user_id
            ).first()
            
            if content_check and content_check.parent_content_id:
                root_content_id = content_check.parent_content_id
            
            # Get all content items in this version chain
            all_versions = db.query(ContentItem).filter(
                ContentItem.user_id == user_id
            ).filter(
                (ContentItem.id == root_content_id) | 
                (ContentItem.parent_content_id == root_content_id)
            ).all()
            
            modifications = []
            seen_modification_ids = set()
            
            # For each version that has modifications, get the modification record
            for version in all_versions:
                if version.modification_instructions:  # This version was created from a modification
                    # Look for the modification record
                    mod_record = db.query(ContentModification).filter(
                        ContentModification.content_id == version.id
                    ).first()
                    
                    if mod_record and str(mod_record.id) not in seen_modification_ids:
                        seen_modification_ids.add(str(mod_record.id))
                        
                        modifications.append({
                            "id": str(mod_record.id),
                            "modification_instructions": version.modification_instructions,
                            "source_version": version.modified_from_version or 1,
                            "target_version": version.version_number,
                            "status": "completed",
                            "created_at": mod_record.created_at.isoformat() if mod_record.created_at else None,
                            "completed_at": version.created_at.isoformat() if version.created_at else None,
                            "new_content_id": str(version.id)
                        })
            
            # Sort by target version number in descending order (latest first)
            modifications.sort(key=lambda x: x["target_version"], reverse=True)
            
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
