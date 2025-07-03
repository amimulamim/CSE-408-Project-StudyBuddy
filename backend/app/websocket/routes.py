"""
WebSocket routes and endpoints
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, Header
from fastapi.security import HTTPBearer

from app.auth.firebase_auth import verify_firebase_token
from .manager import websocket_manager
from .types import WebSocketMessage, MessageType

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter()


def get_user_from_token(token: Optional[str] = Query(None)) -> Optional[str]:
    """
    Extract user ID from WebSocket connection token
    
    Args:
        token: JWT token passed as query parameter
        
    Returns:
        user_id if token is valid, None otherwise
    """
    if not token:
        return None
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_info = verify_firebase_token(token)
        return user_info.get("uid") if user_info else None
    except Exception as e:
        logger.error(f"Error decoding WebSocket token: {e}")
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    user_agent: Optional[str] = Header(None)
):
    """
    Main WebSocket endpoint for real-time communication
    
    Query Parameters:
        token: JWT authentication token
        
    Headers:
        user-agent: Client user agent string
    """
    user_id = get_user_from_token(token)
    
    if not user_id:
        # Close connection if not authenticated
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    # Get client IP (this might need adjustment based on your proxy setup)
    client_ip = websocket.client.host if websocket.client else None
    
    # Connect the WebSocket
    await websocket_manager.connect(
        websocket=websocket,
        user_id=user_id,
        user_agent=user_agent,
        ip_address=client_ip
    )
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse the message
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                # Handle different message types
                if message_type == MessageType.PING:
                    await websocket_manager.handle_ping(websocket)
                    
                elif message_type == MessageType.DISCONNECT:
                    # Client requesting disconnection
                    break
                    
                else:
                    # Log unhandled message types for debugging
                    logger.info(f"Received unhandled message type: {message_type} from user: {user_id}")
                    
            except json.JSONDecodeError:
                # Send error message for invalid JSON
                error_message = WebSocketMessage(
                    type=MessageType.ERROR,
                    data={"error": "Invalid JSON format"},
                    user_id=user_id
                )
                await websocket_manager._send_to_websocket(websocket, error_message)
                
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                error_message = WebSocketMessage(
                    type=MessageType.ERROR,
                    data={"error": "Message processing error"},
                    user_id=user_id
                )
                await websocket_manager._send_to_websocket(websocket, error_message)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        # Clean up the connection
        websocket_manager.disconnect(websocket)


@router.get("/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics
    (This endpoint can be used for monitoring)
    """
    return {
        "total_connections": websocket_manager.get_total_connection_count(),
        "connected_users": len(websocket_manager.get_connected_users()),
        "user_list": websocket_manager.get_connected_users()
    }
