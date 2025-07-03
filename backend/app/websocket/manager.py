"""
WebSocket connection manager
Handles multiple WebSocket connections and message broadcasting
"""
import json
import asyncio
import logging
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

from .types import WebSocketMessage, MessageType, ConnectionInfo

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections for real-time communication
    Supports user-based connection grouping and selective broadcasting
    """
    
    def __init__(self):
        # Active connections: {user_id: {connection_id: (websocket, connection_info)}}
        self.active_connections: Dict[str, Dict[str, tuple[WebSocket, ConnectionInfo]]] = {}
        # Keep track of all websockets for global operations
        self.all_connections: Set[WebSocket] = set()
        # Connection counter for unique IDs
        self._connection_counter = 0
    
    def _generate_connection_id(self) -> str:
        """Generate unique connection ID"""
        self._connection_counter += 1
        return f"conn_{self._connection_counter}_{datetime.now(timezone.utc).timestamp()}"
    
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """
        Accept a new WebSocket connection
        
        Args:
            websocket: The WebSocket connection
            user_id: User ID associated with this connection
            user_agent: User agent string (optional)
            ip_address: Client IP address (optional)
            
        Returns:
            connection_id: Unique identifier for this connection
        """
        await websocket.accept()
        
        connection_id = self._generate_connection_id()
        connection_info = ConnectionInfo(
            user_id=user_id,
            connected_at=datetime.now(timezone.utc),
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Initialize user's connection dict if not exists
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        # Store the connection
        self.active_connections[user_id][connection_id] = (websocket, connection_info)
        self.all_connections.add(websocket)
        
        logger.info(f"WebSocket connected: user_id={user_id}, connection_id={connection_id}")
        
        # Send welcome message
        welcome_message = WebSocketMessage(
            type=MessageType.CONNECT,
            data={"connection_id": connection_id, "status": "connected"},
            user_id=user_id
        )
        await self._send_to_websocket(websocket, welcome_message)
        
        return connection_id
    
    def disconnect(self, websocket: WebSocket) -> Optional[str]:
        """
        Remove a WebSocket connection
        
        Args:
            websocket: The WebSocket connection to remove
            
        Returns:
            user_id: The user ID of the disconnected user (if found)
        """
        user_id = None
        connection_id = None
        
        # Find and remove the connection
        for uid, connections in self.active_connections.items():
            for cid, (ws, _) in connections.items():
                if ws == websocket:
                    user_id = uid
                    connection_id = cid
                    break
            if user_id:
                break
        
        if user_id and connection_id:
            # Remove the specific connection
            del self.active_connections[user_id][connection_id]
            
            # Remove user entry if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from all connections
        self.all_connections.discard(websocket)
        
        if user_id:
            logger.info(f"WebSocket disconnected: user_id={user_id}, connection_id={connection_id}")
        
        return user_id
    
    async def send_to_user(self, user_id: str, message: WebSocketMessage) -> int:
        """
        Send a message to all connections of a specific user
        
        Args:
            user_id: Target user ID
            message: Message to send
            
        Returns:
            Number of connections the message was sent to
        """
        if user_id not in self.active_connections:
            return 0
        
        connections = list(self.active_connections[user_id].values())
        sent_count = 0
        
        # Send to all user's connections
        for websocket, _ in connections:
            try:
                await self._send_to_websocket(websocket, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                # Connection might be dead, let disconnect handle cleanup
                self.disconnect(websocket)
        
        return sent_count
    
    async def send_to_multiple_users(self, user_ids: List[str], message: WebSocketMessage) -> int:
        """
        Send a message to multiple users
        
        Args:
            user_ids: List of target user IDs
            message: Message to send
            
        Returns:
            Total number of connections the message was sent to
        """
        total_sent = 0
        
        for user_id in user_ids:
            sent = await self.send_to_user(user_id, message)
            total_sent += sent
        
        return total_sent
    
    async def broadcast_to_all(self, message: WebSocketMessage) -> int:
        """
        Broadcast a message to all connected users
        
        Args:
            message: Message to broadcast
            
        Returns:
            Number of connections the message was sent to
        """
        connections = list(self.all_connections)
        sent_count = 0
        
        for websocket in connections:
            try:
                await self._send_to_websocket(websocket, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                self.disconnect(websocket)
        
        return sent_count
    
    async def _send_to_websocket(self, websocket: WebSocket, message: WebSocketMessage):
        """
        Send a message to a specific WebSocket connection
        
        Args:
            websocket: Target WebSocket connection
            message: Message to send
        """
        try:
            message_json = message.model_dump(mode='json')
            await websocket.send_text(json.dumps(message_json))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            raise
    
    async def handle_ping(self, websocket: WebSocket) -> bool:
        """
        Handle ping message and respond with pong
        
        Args:
            websocket: WebSocket connection that sent ping
            
        Returns:
            True if pong was sent successfully, False otherwise
        """
        try:
            pong_message = WebSocketMessage(type=MessageType.PONG)
            await self._send_to_websocket(websocket, pong_message)
            
            # Update last ping time
            for user_id, connections in self.active_connections.items():
                for connection_id, (ws, conn_info) in connections.items():
                    if ws == websocket:
                        conn_info.last_ping = datetime.now(timezone.utc)
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Error handling ping: {e}")
            return False
    
    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.active_connections.get(user_id, {}))
    
    def get_total_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.all_connections)
    
    def get_connected_users(self) -> List[str]:
        """Get list of all connected user IDs"""
        return list(self.active_connections.keys())
    
    def is_user_connected(self, user_id: str) -> bool:
        """Check if a user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
