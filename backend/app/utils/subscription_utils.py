from sqlalchemy.orm import Session
from app.billing.db import Subscription
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def has_active_premium_subscription(user_id: str, db: Session) -> bool:
    """
    Check if a user has an active premium subscription.
    
    Args:
        user_id: The user's ID
        db: Database session
        
    Returns:
        True if user has active premium subscription, False otherwise
    """
    try:
        # Check for active premium subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.plan_id.in_(["premium_monthly", "premium_yearly"])
        ).first()
        
        if not subscription:
            return False
            
        # Check if subscription hasn't expired
        if subscription.end_date and subscription.end_date < datetime.now():
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"Error checking subscription for user {user_id}: {str(e)}")
        return False

def get_daily_content_count(user_id: str, db: Session) -> int:
    """
    Get the number of content items created by user today.
    
    Args:
        user_id: The user's ID
        db: Database session
        
    Returns:
        Number of content items created today
    """
    try:
        from app.content_generator.models import ContentItem
        from sqlalchemy import func, text
        
        # Get today's date in UTC
        today = datetime.now().date()
        
        # Count content items created today
        count = db.query(ContentItem).filter(
            ContentItem.user_id == user_id,
            func.date(ContentItem.created_at) == today
        ).count()
        
        return count
        
    except Exception as e:
        logger.error(f"Error getting daily content count for user {user_id}: {str(e)}")
        return 0
