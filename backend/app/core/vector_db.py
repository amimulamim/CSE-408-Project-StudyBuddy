import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
import logging

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
                logger.info(f"Created collection: {self.collection_name}")
            else:
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
    
    def upsert_vectors(self, document_id: str, chunks: List[str], embeddings: List[List[float]], document_name: str = None, storage_path: str = None):
        """Upserts text chunks and their embeddings to Qdrant."""
        try:
            points = [
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "document_id": document_id,
                        "document_name": document_name,
                        "storage_path": storage_path,
                        "chunk_index": idx,
                        "text": chunk
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