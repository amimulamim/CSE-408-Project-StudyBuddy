"""
WebSocket notification service
Handles real-time notification broadcasting via WebSocket
"""
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.admin.model import Notification
from app.utils.notification_helpers import get_unread_count
from .manager import websocket_manager
from .types import NotificationMessage, WebSocketMessage, MessageType

logger = logging.getLogger(__name__)


class WebSocketNotificationService:
    """
    Service for sending notifications via WebSocket
    """
    
    @staticmethod
    async def notify_new_notification(
        user_id: str, 
        notification_data: Dict[str, Any],
        db: Optional[Session] = None
    ) -> int:
        """
        Send new notification to user via WebSocket
        
        Args:
            user_id: Target user ID
            notification_data: Notification data
            db: Database session (optional, for getting updated unread count)
            
        Returns:
            Number of connections the notification was sent to
        """
        try:
            # Create notification message
            message = NotificationMessage.new_notification(notification_data, user_id)
            
            # Send to user
            sent_count = await websocket_manager.send_to_user(user_id, message)
            
            # Also send updated unread count if DB session is available
            if db:
                await WebSocketNotificationService.notify_unread_count_update(user_id, db)
            
            logger.info(f"Sent new notification to user {user_id} via {sent_count} WebSocket connections")
            return sent_count
            
        except Exception as e:
            logger.error(f"Error sending notification via WebSocket: {e}")
            return 0
    
    @staticmethod
    async def notify_unread_count_update(user_id: str, db: Session) -> int:
        """
        Send updated unread count to user via WebSocket
        
        Args:
            user_id: Target user ID
            db: Database session
            
        Returns:
            Number of connections the update was sent to
        """
        try:
            # Get current unread count
            unread_count = get_unread_count(db, user_id)
            
            # Create count update message
            message = NotificationMessage.unread_count(unread_count, user_id)
            
            # Send to user
            sent_count = await websocket_manager.send_to_user(user_id, message)
            
            logger.debug(f"Sent unread count update ({unread_count}) to user {user_id} via {sent_count} connections")
            return sent_count
            
        except Exception as e:
            logger.error(f"Error sending unread count update via WebSocket: {e}")
            return 0
    
    @staticmethod
    async def notify_notification_read(user_id: str, notification_id: str, db: Session) -> int:
        """
        Notify user that a notification was marked as read
        
        Args:
            user_id: Target user ID
            notification_id: ID of the notification that was read
            db: Database session
            
        Returns:
            Number of connections the update was sent to
        """
        try:
            # Send notification update
            message = WebSocketMessage(
                type=MessageType.NOTIFICATION_UPDATE,
                data={
                    "notification_id": notification_id,
                    "is_read": True,
                    "action": "marked_as_read"
                },
                user_id=user_id
            )
            
            sent_count = await websocket_manager.send_to_user(user_id, message)
            
            # Also send updated unread count
            await WebSocketNotificationService.notify_unread_count_update(user_id, db)
            
            logger.debug(f"Sent notification read update to user {user_id} via {sent_count} connections")
            return sent_count
            
        except Exception as e:
            logger.error(f"Error sending notification read update via WebSocket: {e}")
            return 0
    
    @staticmethod
    async def notify_all_notifications_read(user_id: str, updated_count: int, db: Session) -> int:
        """
        Notify user that all notifications were marked as read
        
        Args:
            user_id: Target user ID
            updated_count: Number of notifications that were updated
            db: Database session
            
        Returns:
            Number of connections the update was sent to
        """
        try:
            # Send bulk update message
            message = WebSocketMessage(
                type=MessageType.NOTIFICATION_UPDATE,
                data={
                    "action": "marked_all_as_read",
                    "updated_count": updated_count
                },
                user_id=user_id
            )
            
            sent_count = await websocket_manager.send_to_user(user_id, message)
            
            # Send updated unread count (should be 0)
            await WebSocketNotificationService.notify_unread_count_update(user_id, db)
            
            logger.info(f"Sent all notifications read update to user {user_id} via {sent_count} connections")
            return sent_count
            
        except Exception as e:
            logger.error(f"Error sending all notifications read update via WebSocket: {e}")
            return 0
    
    @staticmethod
    async def notify_system_message(
        user_ids: List[str], 
        message: str, 
        message_type: str = "info"
    ) -> int:
        """
        Send system message to multiple users
        
        Args:
            user_ids: List of target user IDs
            message: System message text
            message_type: Type of message (info, warning, error, success)
            
        Returns:
            Total number of connections the message was sent to
        """
        try:
            # Create system message
            system_message = WebSocketMessage(
                type=MessageType.SYSTEM_MESSAGE,
                data={
                    "message": message,
                    "message_type": message_type
                }
            )
            
            # Send to multiple users
            total_sent = await websocket_manager.send_to_multiple_users(user_ids, system_message)
            
            logger.info(f"Sent system message to {len(user_ids)} users via {total_sent} connections")
            return total_sent
            
        except Exception as e:
            logger.error(f"Error sending system message via WebSocket: {e}")
            return 0
    
    @staticmethod
    def is_user_connected(user_id: str) -> bool:
        """
        Check if a user is currently connected via WebSocket
        
        Args:
            user_id: User ID to check
            
        Returns:
            True if user has active WebSocket connections
        """
        return websocket_manager.is_user_connected(user_id)
    
    @staticmethod
    def get_connection_stats() -> Dict[str, Any]:
        """
        Get WebSocket connection statistics
        
        Returns:
            Dictionary with connection statistics
        """
        return {
            "total_connections": websocket_manager.get_total_connection_count(),
            "connected_users_count": len(websocket_manager.get_connected_users()),
            "connected_users": websocket_manager.get_connected_users()
        }


# Global notification service instance
notification_service = WebSocketNotificationService()
