"""
WebSocket manager tests
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone

from app.websocket.manager import WebSocketManager
from app.websocket.types import WebSocketMessage, MessageType, ConnectionInfo


class TestWebSocketManager:
    """Test WebSocket manager functionality"""
    
    def setup_method(self):
        """Setup for each test"""
        self.manager = WebSocketManager()
    
    @pytest.mark.asyncio
    async def test_connect_new_user(self):
        """Test connecting a new user"""
        mock_websocket = AsyncMock()
        user_id = "test-user-123"
        
        await self.manager.connect(
            websocket=mock_websocket,
            user_id=user_id,
            user_agent="Test Agent",
            ip_address="127.0.0.1"
        )
        
        # Verify connection was stored
        assert user_id in self.manager.active_connections
        assert len(self.manager.active_connections[user_id]) == 1
        assert mock_websocket in self.manager.all_connections
        assert self.manager.get_user_connection_count(user_id) == 1
        assert self.manager.get_total_connection_count() == 1
        
        # Verify websocket.accept was called
        mock_websocket.accept.assert_called_once()
        
        # Verify welcome message was sent
        mock_websocket.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_multiple_connections_same_user(self):
        """Test multiple connections for the same user"""
        mock_websocket1 = AsyncMock()
        mock_websocket2 = AsyncMock()
        user_id = "test-user-123"
        
        # Connect first websocket
        await self.manager.connect(mock_websocket1, user_id)
        
        # Connect second websocket for same user
        await self.manager.connect(mock_websocket2, user_id)
        
        # Verify both connections are stored
        assert self.manager.get_user_connection_count(user_id) == 2
        assert self.manager.get_total_connection_count() == 2
        assert mock_websocket1 in self.manager.all_connections
        assert mock_websocket2 in self.manager.all_connections
    
    def test_disconnect_existing_connection(self):
        """Test disconnecting an existing connection"""
        mock_websocket = AsyncMock()
        user_id = "test-user-123"
        
        # First connect
        self.manager.active_connections[user_id] = {
            "conn_1": (mock_websocket, Mock())
        }
        self.manager.all_connections.add(mock_websocket)
        
        # Disconnect
        disconnected_user_id = self.manager.disconnect(mock_websocket)
        
        # Verify disconnection
        assert disconnected_user_id == user_id
        assert user_id not in self.manager.active_connections
        assert mock_websocket not in self.manager.all_connections
        assert self.manager.get_total_connection_count() == 0
    
    def test_disconnect_nonexistent_connection(self):
        """Test disconnecting a connection that doesn't exist"""
        mock_websocket = AsyncMock()
        
        disconnected_user_id = self.manager.disconnect(mock_websocket)
        
        assert disconnected_user_id is None
    
    @pytest.mark.asyncio
    async def test_send_to_user_existing(self):
        """Test sending message to existing user"""
        mock_websocket = AsyncMock()
        user_id = "test-user-123"
        
        # Setup connection
        self.manager.active_connections[user_id] = {
            "conn_1": (mock_websocket, Mock())
        }
        
        # Send message
        message = WebSocketMessage(type=MessageType.PING)
        sent_count = await self.manager.send_to_user(user_id, message)
        
        # Verify message was sent
        assert sent_count == 1
        mock_websocket.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_to_user_nonexistent(self):
        """Test sending message to non-existent user"""
        message = WebSocketMessage(type=MessageType.PING)
        sent_count = await self.manager.send_to_user("nonexistent-user", message)
        
        assert sent_count == 0
    
    @pytest.mark.asyncio
    async def test_send_to_multiple_users(self):
        """Test sending message to multiple users"""
        mock_websocket1 = AsyncMock()
        mock_websocket2 = AsyncMock()
        user_id1 = "user-1"
        user_id2 = "user-2"
        
        # Setup connections
        self.manager.active_connections[user_id1] = {
            "conn_1": (mock_websocket1, Mock())
        }
        self.manager.active_connections[user_id2] = {
            "conn_1": (mock_websocket2, Mock())
        }
        
        # Send message to multiple users
        message = WebSocketMessage(type=MessageType.PING)
        sent_count = await self.manager.send_to_multiple_users([user_id1, user_id2], message)
        
        # Verify message was sent to both
        assert sent_count == 2
        mock_websocket1.send_text.assert_called_once()
        mock_websocket2.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_broadcast_to_all(self):
        """Test broadcasting message to all connected users"""
        mock_websocket1 = AsyncMock()
        mock_websocket2 = AsyncMock()
        
        # Setup connections
        self.manager.all_connections.add(mock_websocket1)
        self.manager.all_connections.add(mock_websocket2)
        
        # Broadcast message
        message = WebSocketMessage(type=MessageType.SYSTEM_MESSAGE)
        sent_count = await self.manager.broadcast_to_all(message)
        
        # Verify message was broadcast to all
        assert sent_count == 2
        mock_websocket1.send_text.assert_called_once()
        mock_websocket2.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_ping(self):
        """Test handling ping message"""
        mock_websocket = AsyncMock()
        user_id = "test-user-123"
        
        # Setup connection
        conn_info = ConnectionInfo(
            user_id=user_id,
            connected_at=datetime.now(timezone.utc)
        )
        self.manager.active_connections[user_id] = {
            "conn_1": (mock_websocket, conn_info)
        }
        
        # Handle ping
        result = await self.manager.handle_ping(mock_websocket)
        
        # Verify pong was sent
        assert result is True
        mock_websocket.send_text.assert_called_once()
        
        # Verify last_ping was updated
        assert conn_info.last_ping is not None
    
    def test_get_connected_users(self):
        """Test getting list of connected users"""
        user_id1 = "user-1"
        user_id2 = "user-2"
        
        # Setup connections
        self.manager.active_connections[user_id1] = {"conn_1": (Mock(), Mock())}
        self.manager.active_connections[user_id2] = {"conn_1": (Mock(), Mock())}
        
        connected_users = self.manager.get_connected_users()
        
        assert set(connected_users) == {user_id1, user_id2}
    
    def test_is_user_connected(self):
        """Test checking if user is connected"""
        user_id = "test-user-123"
        
        # User not connected
        assert self.manager.is_user_connected(user_id) is False
        
        # Connect user
        self.manager.active_connections[user_id] = {"conn_1": (Mock(), Mock())}
        
        # User is connected
        assert self.manager.is_user_connected(user_id) is True
        
        # Remove connections but keep empty dict
        self.manager.active_connections[user_id] = {}
        
        # User not connected (empty connections dict)
        assert self.manager.is_user_connected(user_id) is False
