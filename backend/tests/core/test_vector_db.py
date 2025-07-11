import pytest
import uuid
from unittest.mock import Mock, patch, MagicMock
from typing import List, Dict, Any

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.core.vector_db import VectorDatabaseManager


class TestVectorDatabaseManager:
    """Test VectorDatabaseManager class methods"""

    def setup_method(self):
        """Set up test dependencies"""
        self.qdrant_url = "http://localhost:6333"
        self.qdrant_api_key = "test-key"
        self.collection_name = "test_collection"
        
        # Mock QdrantClient
        self.mock_client = Mock()
        
        with patch('app.core.vector_db.QdrantClient') as mock_qdrant_client:
            mock_qdrant_client.return_value = self.mock_client
            self.vector_db = VectorDatabaseManager(
                qdrant_url=self.qdrant_url,
                qdrant_api_key=self.qdrant_api_key,
                collection_name=self.collection_name
            )

    def test_initialization_success(self):
        """Test successful VectorDatabaseManager initialization"""
        # Arrange & Act
        with patch('app.core.vector_db.QdrantClient') as mock_qdrant_client:
            mock_client = Mock()
            mock_qdrant_client.return_value = mock_client
            
            vector_db = VectorDatabaseManager(
                qdrant_url="http://localhost:6333",
                qdrant_api_key="test-key",
                collection_name="test_collection"
            )
            
            # Assert
            assert vector_db.client == mock_client
            assert vector_db.collection_name == "test_collection"
            mock_qdrant_client.assert_called_once_with(
                url="http://localhost:6333",
                api_key="test-key"
            )

    def test_initialization_failure(self):
        """Test VectorDatabaseManager initialization failure"""
        # Arrange
        with patch('app.core.vector_db.QdrantClient') as mock_qdrant_client:
            mock_qdrant_client.side_effect = Exception("Connection failed")
            
            # Act & Assert
            with pytest.raises(Exception, match="Error initializing Qdrant client: Connection failed"):
                VectorDatabaseManager(
                    qdrant_url="invalid-url",
                    qdrant_api_key="invalid-key",
                    collection_name="test_collection"
                )

    def test_create_collection_new_collection(self):
        """Test creating a new collection that doesn't exist"""
        # Arrange
        mock_collections_response = Mock()
        mock_collections_response.collections = []
        self.mock_client.get_collections.return_value = mock_collections_response
        
        # Act
        result = self.vector_db.create_collection()
        
        # Assert
        assert result == {"message": f"Collection {self.collection_name} created or already exists"}
        self.mock_client.get_collections.assert_called_once()
        self.mock_client.create_collection.assert_called_once()

    def test_create_collection_existing_collection(self):
        """Test creating a collection that already exists"""
        # Arrange
        mock_collection = Mock()
        mock_collection.name = self.collection_name
        mock_collections_response = Mock()
        mock_collections_response.collections = [mock_collection]
        self.mock_client.get_collections.return_value = mock_collections_response
        
        # Act
        result = self.vector_db.create_collection()
        
        # Assert
        assert result == {"message": f"Collection {self.collection_name} created or already exists"}
        self.mock_client.get_collections.assert_called_once()
        self.mock_client.create_collection.assert_not_called()

    def test_create_collection_error(self):
        """Test create_collection when an error occurs"""
        # Arrange
        self.mock_client.get_collections.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error creating collection: Database error"):
            self.vector_db.create_collection()

    def test_delete_collection_success(self):
        """Test successful collection deletion"""
        # Arrange
        self.mock_client.delete_collection.return_value = None
        
        # Act
        result = self.vector_db.delete_collection()
        
        # Assert
        assert result == {"message": f"Collection {self.collection_name} deleted"}
        self.mock_client.delete_collection.assert_called_once_with(
            collection_name=self.collection_name
        )

    def test_delete_collection_error(self):
        """Test delete_collection when an error occurs"""
        # Arrange
        self.mock_client.delete_collection.side_effect = Exception("Delete failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error deleting collection: Delete failed"):
            self.vector_db.delete_collection()

    def test_list_collections_success(self):
        """Test successful collection listing"""
        # Arrange
        mock_collection1 = Mock()
        mock_collection1.name = "collection1"
        mock_collection2 = Mock()
        mock_collection2.name = "collection2"
        
        mock_collections_response = Mock()
        mock_collections_response.collections = [mock_collection1, mock_collection2]
        self.mock_client.get_collections.return_value = mock_collections_response
        
        # Act
        result = self.vector_db.list_collections()
        
        # Assert
        assert result == ["collection1", "collection2"]
        self.mock_client.get_collections.assert_called_once()

    def test_list_collections_empty(self):
        """Test listing collections when no collections exist"""
        # Arrange
        mock_collections_response = Mock()
        mock_collections_response.collections = []
        self.mock_client.get_collections.return_value = mock_collections_response
        
        # Act
        result = self.vector_db.list_collections()
        
        # Assert
        assert result == []
        self.mock_client.get_collections.assert_called_once()

    def test_list_collections_error(self):
        """Test list_collections when an error occurs"""
        # Arrange
        self.mock_client.get_collections.side_effect = Exception("List failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error listing collections: List failed"):
            self.vector_db.list_collections()

    @patch('app.core.vector_db.uuid.uuid4')
    @patch('app.core.vector_db.models.PointStruct')
    def test_upsert_vectors_success(self, mock_point_struct, mock_uuid4):
        """Test successful vector upserting"""
        # Arrange
        document_id = "doc123"
        chunks = ["chunk1", "chunk2"]
        embeddings = [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
        
        # Mock UUID generation
        mock_uuid4.side_effect = ["uuid1", "uuid2"]
        
        # Mock PointStruct creation
        mock_point1 = Mock()
        mock_point2 = Mock()
        mock_point_struct.side_effect = [mock_point1, mock_point2]
        
        # Act
        result = self.vector_db.upsert_vectors(document_id, chunks, embeddings)
        
        # Assert
        assert result == {"message": f"Upserted 2 points for document {document_id}"}
        assert mock_point_struct.call_count == 2
        
        # Verify first point creation
        mock_point_struct.assert_any_call(
            id="uuid1",
            vector=[1.0, 2.0, 3.0],
            payload={
                "document_id": document_id,
                "document_name": None,
                "storage_path": None,
                "chunk_index": 0,
                "text": "chunk1"
            }
        )
        
        # Verify second point creation
        mock_point_struct.assert_any_call(
            id="uuid2",
            vector=[4.0, 5.0, 6.0],
            payload={
                "document_id": document_id,
                "document_name": None,
                "storage_path": None,
                "chunk_index": 1,
                "text": "chunk2"
            }
        )
        
        self.mock_client.upsert.assert_called_once_with(
            collection_name=self.collection_name,
            points=[mock_point1, mock_point2]
        )

    def test_upsert_vectors_empty_data(self):
        """Test upserting with empty chunks and embeddings"""
        # Arrange
        document_id = "doc123"
        chunks = []
        embeddings = []
        
        # Act
        result = self.vector_db.upsert_vectors(document_id, chunks, embeddings)
        
        # Assert
        assert result == {"message": f"Upserted 0 points for document {document_id}"}
        self.mock_client.upsert.assert_called_once_with(
            collection_name=self.collection_name,
            points=[]
        )

    def test_upsert_vectors_error(self):
        """Test upsert_vectors when an error occurs"""
        # Arrange
        document_id = "doc123"
        chunks = ["chunk1"]
        embeddings = [[1.0, 2.0, 3.0]]
        self.mock_client.upsert.side_effect = Exception("Upsert failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error upserting vectors: Upsert failed"):
            self.vector_db.upsert_vectors(document_id, chunks, embeddings)

    def test_search_vectors_success(self):
        """Test successful vector search"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        limit = 5
        
        # Mock search results
        mock_hit1 = Mock()
        mock_hit1.id = "hit1"
        mock_hit1.score = 0.95
        mock_hit1.payload = {
            "text": "Found text 1",
            "document_id": "doc1",
            "chunk_index": 0
        }
        
        mock_hit2 = Mock()
        mock_hit2.id = "hit2"
        mock_hit2.score = 0.85
        mock_hit2.payload = {
            "text": "Found text 2",
            "document_id": "doc2",
            "chunk_index": 1
        }
        
        self.mock_client.search.return_value = [mock_hit1, mock_hit2]
        
        # Act
        result = self.vector_db.search_vectors(query_embedding, limit)
        
        # Assert
        expected_result = [
            {
                "text": "Found text 1",
                "document_id": "doc1",
                "chunk_index": 0,
                "score": 0.95
            },
            {
                "text": "Found text 2",
                "document_id": "doc2",
                "chunk_index": 1,
                "score": 0.85
            }
        ]
        assert result == expected_result
        self.mock_client.search.assert_called_once_with(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=limit
        )

    def test_search_vectors_default_limit(self):
        """Test vector search with default limit"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        self.mock_client.search.return_value = []
        
        # Act
        result = self.vector_db.search_vectors(query_embedding)
        
        # Assert
        assert result == []
        self.mock_client.search.assert_called_once_with(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=5  # Default limit
        )

    def test_search_vectors_missing_payload(self):
        """Test vector search with missing payload data"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        
        # Mock search results with invalid payloads
        mock_hit1 = Mock()
        mock_hit1.id = "hit1"
        mock_hit1.score = 0.95
        mock_hit1.payload = None  # Missing payload
        
        mock_hit2 = Mock()
        mock_hit2.id = "hit2"
        mock_hit2.score = 0.85
        mock_hit2.payload = {
            "text": "Found text 2",
            # Missing document_id and chunk_index
        }
        
        mock_hit3 = Mock()
        mock_hit3.id = "hit3"
        mock_hit3.score = 0.75
        mock_hit3.payload = {
            "text": "Found text 3",
            "document_id": "doc3",
            "chunk_index": 2
        }
        
        self.mock_client.search.return_value = [mock_hit1, mock_hit2, mock_hit3]
        
        # Act
        result = self.vector_db.search_vectors(query_embedding)
        
        # Assert
        # Only the third hit should be returned (valid payload)
        expected_result = [
            {
                "text": "Found text 3",
                "document_id": "doc3",
                "chunk_index": 2,
                "score": 0.75
            }
        ]
        assert result == expected_result

    def test_search_vectors_no_results(self):
        """Test vector search with no results"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        self.mock_client.search.return_value = []
        
        # Act
        result = self.vector_db.search_vectors(query_embedding)
        
        # Assert
        assert result == []

    def test_search_vectors_error(self):
        """Test search_vectors when an error occurs"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        self.mock_client.search.side_effect = Exception("Search failed")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error searching vectors: Search failed"):
            self.vector_db.search_vectors(query_embedding)

    def test_collection_name_property(self):
        """Test that collection name is properly set"""
        # Assert
        assert self.vector_db.collection_name == self.collection_name

    def test_client_property(self):
        """Test that client is properly set"""
        # Assert
        assert self.vector_db.client == self.mock_client

    @patch('app.core.vector_db.models.VectorParams')
    @patch('app.core.vector_db.models.Distance')
    def test_create_collection_vector_params(self, mock_distance, mock_vector_params):
        """Test that create_collection uses correct vector parameters"""
        # Arrange
        mock_collections_response = Mock()
        mock_collections_response.collections = []
        self.mock_client.get_collections.return_value = mock_collections_response
        
        mock_vector_config = Mock()
        mock_vector_params.return_value = mock_vector_config
        mock_distance.COSINE = "Cosine"
        
        # Act
        self.vector_db.create_collection()
        
        # Assert
        mock_vector_params.assert_called_once_with(size=768, distance="Cosine")

    def test_upsert_vectors_mismatched_lengths(self):
        """Test upsert_vectors with mismatched chunks and embeddings lengths"""
        # Arrange
        document_id = "doc123"
        chunks = ["chunk1", "chunk2"]
        embeddings = [[1.0, 2.0, 3.0]]  # Only one embedding for two chunks
        
        # Act & Assert
        # The zip function will only process pairs up to the shortest list
        # So this should process only one point
        with patch('app.core.vector_db.uuid.uuid4', return_value="uuid1"), \
             patch('app.core.vector_db.models.PointStruct') as mock_point_struct:
            
            mock_point = Mock()
            mock_point_struct.return_value = mock_point
            
            result = self.vector_db.upsert_vectors(document_id, chunks, embeddings)
            
            assert result == {"message": f"Upserted 1 points for document {document_id}"}
            assert mock_point_struct.call_count == 1

    def test_search_vectors_all_invalid_payloads(self):
        """Test vector search when all results have invalid payloads"""
        # Arrange
        query_embedding = [1.0, 2.0, 3.0]
        
        # Mock search results with all invalid payloads
        mock_hit1 = Mock()
        mock_hit1.id = "hit1"
        mock_hit1.payload = None
        
        mock_hit2 = Mock()
        mock_hit2.id = "hit2"
        mock_hit2.payload = {"text": "incomplete"}  # Missing required fields
        
        self.mock_client.search.return_value = [mock_hit1, mock_hit2]
        
        # Act
        result = self.vector_db.search_vectors(query_embedding)
        
        # Assert
        assert result == []  # Should return empty list when no valid results

    def test_integration_workflow(self):
        """Test a complete workflow: create collection, upsert vectors, search"""
        # Arrange
        mock_collections_response = Mock()
        mock_collections_response.collections = []
        self.mock_client.get_collections.return_value = mock_collections_response
        
        # Mock search result
        mock_hit = Mock()
        mock_hit.id = "hit1"
        mock_hit.score = 0.95
        mock_hit.payload = {
            "text": "Found text",
            "document_id": "doc1",
            "chunk_index": 0
        }
        self.mock_client.search.return_value = [mock_hit]
        
        # Act
        # 1. Create collection
        create_result = self.vector_db.create_collection()
        
        # 2. Upsert vectors
        with patch('app.core.vector_db.uuid.uuid4', return_value="uuid1"), \
             patch('app.core.vector_db.models.PointStruct') as mock_point_struct:
            mock_point = Mock()
            mock_point_struct.return_value = mock_point
            
            upsert_result = self.vector_db.upsert_vectors(
                "doc1", ["test text"], [[1.0, 2.0, 3.0]]
            )
        
        # 3. Search vectors
        search_result = self.vector_db.search_vectors([1.0, 2.0, 3.0])
        
        # Assert
        assert create_result["message"] == f"Collection {self.collection_name} created or already exists"
        assert upsert_result["message"] == "Upserted 1 points for document doc1"
        assert len(search_result) == 1
        assert search_result[0]["text"] == "Found text"
