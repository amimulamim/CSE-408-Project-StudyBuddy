import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
import logging
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorDatabaseManager:
    """Manages interactions with Qdrant vector database."""
    
    def __init__(self, qdrant_url: str, qdrant_api_key: str, collection_name: str):
        try:
            self.client = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key
            )
            self.collection_name = collection_name
        except Exception as e:
            raise Exception(f"Error initializing Qdrant client: {str(e)}")
    
    def create_collection(self):
        """Creates a Qdrant collection if it doesn't exist."""
        try:
            collections = self.client.get_collections()
            if self.collection_name not in [c.name for c in collections.collections]:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE)
                )
                
                # Create index for document_id field to enable filtering
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                
                logger.info(f"Created collection: {self.collection_name} with document_id index")
            else:
                # Check if index exists for existing collections
                try:
                    collection_info = self.client.get_collection(self.collection_name)
                    if "document_id" not in collection_info.payload_schema:
                        # Create the missing index
                        self.client.create_payload_index(
                            collection_name=self.collection_name,
                            field_name="document_id",
                            field_schema=models.PayloadSchemaType.KEYWORD
                        )
                        logger.info(f"Created missing document_id index for collection: {self.collection_name}")
                except Exception as e:
                    logger.warning(f"Could not check/create index for existing collection: {str(e)}")
                
                logger.info(f"Collection {self.collection_name} already exists")
            return {"message": f"Collection {self.collection_name} created or already exists"}
        except Exception as e:
            logger.error(f"Error creating collection: {str(e)}")
            raise Exception(f"Error creating collection: {str(e)}")
    
    def delete_collection(self):
        """Deletes a Qdrant collection."""
        try:
            self.client.delete_collection(collection_name=self.collection_name)
            logger.info(f"Deleted collection: {self.collection_name}")
            return {"message": f"Collection {self.collection_name} deleted"}
        except Exception as e:
            logger.error(f"Error deleting collection: {str(e)}")
            raise Exception(f"Error deleting collection: {str(e)}")
    
    def list_collections(self):
        """Lists all Qdrant collections."""
        try:
            collections = self.client.get_collections()
            collection_names = [c.name for c in collections.collections]
            logger.info(f"Listed collections: {collection_names}")
            return collection_names
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
            raise Exception(f"Error listing collections: {str(e)}")

    def ensure_document_id_index(self):
        """Ensure document_id index exists for the collection."""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            if "document_id" not in collection_info.payload_schema:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                logger.info(f"Created document_id index for collection: {self.collection_name}")
                return True
            else:
                logger.debug(f"document_id index already exists for collection: {self.collection_name}")
                return True
        except Exception as e:
            logger.error(f"Error ensuring document_id index: {str(e)}")
            return False
    
    def upsert_vectors(self, document_id: str, chunks: List[str], embeddings: List[List[float]], document_name: str = None, storage_path: str = None):
        """Upserts text chunks and their embeddings to Qdrant."""
        try:
            upload_timestamp = datetime.now(timezone.utc).isoformat()
            
            points = [
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "document_id": document_id,
                        "document_name": document_name,
                        "storage_path": storage_path,
                        "chunk_index": idx,
                        "text": chunk,
                        "upload_timestamp": upload_timestamp
                    }
                )
                for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings))
            ]
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Upserted {len(points)} points for document {document_id}")
            return {"message": f"Upserted {len(points)} points for document {document_id}"}
        except Exception as e:
            logger.error(f"Error upserting vectors for document {document_id}: {str(e)}")
            raise RuntimeError(f"Error upserting vectors: {str(e)}")
    
    def search_vectors(self, query_embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Performs similarity search in Qdrant."""
        try:
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=limit
            )
            results = []
            for hit in search_result:
                if hit.payload is None or not all(key in hit.payload for key in ["text", "document_id", "chunk_index"]):
                    logger.warning(f"Skipping point {hit.id} with missing or invalid payload")
                    continue
                results.append({
                    "text": hit.payload["text"],
                    "document_id": hit.payload["document_id"],
                    "chunk_index": hit.payload["chunk_index"],
                    "score": hit.score
                })
            if not results:
                logger.warning(f"No valid results found for query in collection {self.collection_name}")
            return results
        except Exception as e:
            logger.error(f"Error searching vectors: {str(e)}")
            raise Exception(f"Error searching vectors: {str(e)}")

    def list_documents(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Lists all documents in the collection by retrieving unique document IDs."""
        try:
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            
            documents = self._process_document_points(scroll_result[0])
            result = list(documents.values())
            
            # Sort by upload timestamp (recent to old), handling None timestamps
            result.sort(key=lambda doc: doc.get("upload_timestamp") or "1900-01-01T00:00:00+00:00", reverse=True)
            
            logger.info(f"Found {len(result)} documents in collection {self.collection_name}")
            return result
            
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            raise RuntimeError(f"Error listing documents: {str(e)}")
    
    def _process_document_points(self, points) -> Dict[str, Dict[str, Any]]:
        """Helper method to process points and extract document information."""
        documents = {}
        for point in points:
            if not (point.payload and "document_id" in point.payload):
                continue
                
            doc_id = point.payload["document_id"]
            if doc_id not in documents:
                documents[doc_id] = {
                    "document_id": doc_id,
                    "document_name": point.payload.get("document_name", "Unknown Document"),
                    "storage_path": point.payload.get("storage_path"),
                    "upload_timestamp": point.payload.get("upload_timestamp"),
                    "chunks_count": 0,
                    "first_chunk": None
                }
            
            documents[doc_id]["chunks_count"] += 1
            if documents[doc_id]["first_chunk"] is None and "text" in point.payload:
                text = point.payload["text"]
                documents[doc_id]["first_chunk"] = text[:200] + "..." if len(text) > 200 else text
        
        return documents

    def update_document_name(self, document_id: str, new_name: str) -> bool:
        """Update the document name for all chunks of a specific document."""
        try:
            # Scroll through all points to find those with the specific document_id
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=1000,
                with_payload=True,
                with_vectors=True
            )
            
            if not scroll_result[0]:
                logger.warning(f"No points found for document {document_id}")
                return False
            
            # Update all points with the new document name
            points_to_update = []
            for point in scroll_result[0]:
                if point.payload:
                    point.payload["document_name"] = new_name
                    points_to_update.append(models.PointStruct(
                        id=point.id,
                        vector=point.vector,
                        payload=point.payload
                    ))
            
            if points_to_update:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=points_to_update
                )
                logger.info(f"Updated document name for {len(points_to_update)} points")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating document name: {str(e)}")
            raise RuntimeError(f"Error updating document name: {str(e)}")

    def delete_document(self, document_id: str) -> bool:
        """Delete all vectors/chunks for a specific document from the collection."""
        try:
            logger.debug(f"Attempting to delete document: {document_id}")
            
            # Ensure document_id index exists before filtering
            index_created = self.ensure_document_id_index()
            if not index_created:
                logger.error("Failed to ensure document_id index exists")
                return False
            
            # Scroll through all points and collect those matching the document_id
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000,  # Large limit to get all chunks of the document
                with_payload=True
            )
            
            if not scroll_result[0]:
                logger.warning(f"No vectors found for document {document_id}")
                return False
            
            # Collect all point IDs to delete
            point_ids = [point.id for point in scroll_result[0]]
            logger.debug(f"Found {len(point_ids)} vectors to delete for document {document_id}")
            
            if point_ids:
                # Delete all points for this document
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=models.PointIdsList(points=point_ids)
                )
                logger.info(f"Deleted {len(point_ids)} vectors for document {document_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            raise RuntimeError(f"Error deleting document: {str(e)}")

    def rename_collection(self, old_name: str, new_name: str) -> bool:
        """Rename a collection by creating a new one and moving all points."""
        try:
            # Check if old collection exists
            collections = self.client.get_collections()
            if old_name not in [c.name for c in collections.collections]:
                logger.warning(f"Source collection {old_name} not found")
                return False
            
            # Check if new collection already exists
            if new_name in [c.name for c in collections.collections]:
                logger.warning(f"Target collection {new_name} already exists")
                return False
            
            # Create new collection with same configuration
            self.client.create_collection(
                collection_name=new_name,
                vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE)
            )
            
            # Get all points from old collection
            scroll_result = self.client.scroll(
                collection_name=old_name,
                limit=10000,  # Large limit to get all points
                with_payload=True,
                with_vectors=True
            )
            
            if scroll_result[0]:  # If there are points to migrate
                # Prepare points for the new collection
                points_to_migrate = []
                for point in scroll_result[0]:
                    points_to_migrate.append(models.PointStruct(
                        id=point.id,
                        vector=point.vector,
                        payload=point.payload
                    ))
                
                # Upsert all points to new collection
                self.client.upsert(
                    collection_name=new_name,
                    points=points_to_migrate
                )
                
                logger.info(f"Migrated {len(points_to_migrate)} points from {old_name} to {new_name}")
            
            # Delete old collection
            self.client.delete_collection(collection_name=old_name)
            
            logger.info(f"Successfully renamed collection from {old_name} to {new_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error renaming collection: {str(e)}")
            # Clean up new collection if it was created
            try:
                self.client.delete_collection(collection_name=new_name)
            except Exception:
                pass
            raise RuntimeError(f"Error renaming collection: {str(e)}")