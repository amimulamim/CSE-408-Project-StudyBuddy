from sqlalchemy.orm import Session
from app.admin.model import AdminLog, Notification, SystemStats
from app.core.database import SessionLocal, engine
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def create_admin_tables():
    """Create admin tables if they don't exist"""
    try:
        # Import models to ensure they're registered with Base
        from app.admin.model import AdminLog, Notification, SystemStats
        from app.core.database import Base
        
        # Create tables
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Admin tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating admin tables: {e}")
        return False

def init_admin_data(db: Session):
    """Initialize basic admin data if needed"""
    try:
        # Check if we have any system stats
        stats_count = db.query(SystemStats).count()
        if stats_count == 0:
            # Create initial system stats entry
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            initial_stats = SystemStats(
                stat_type="daily",
                date=today,
                users_added=0,
                content_generated=0,
                quiz_generated=0,
                content_uploaded=0,
                chats_done=0
            )
            db.add(initial_stats)
            db.commit()
            logger.info("Initial system stats created")
        
        return True
    except Exception as e:
        logger.error(f"Error initializing admin data: {e}")
        db.rollback()
        return False

def cleanup_old_logs(db: Session, days_to_keep: int = 90):
    """Clean up old admin logs (optional maintenance function)"""
    try:
        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        deleted_count = db.query(AdminLog)\
                         .filter(AdminLog.created_at < cutoff_date)\
                         .delete()
        
        db.commit()
        logger.info(f"Cleaned up {deleted_count} old admin logs")
        return deleted_count
    except Exception as e:
        logger.error(f"Error cleaning up logs: {e}")
        db.rollback()
        return 0

if __name__ == "__main__":
    # Initialize admin tables
    if create_admin_tables():
        print("Admin tables created successfully")
        
        # Initialize data
        db = SessionLocal()
        try:
            if init_admin_data(db):
                print("Admin data initialized successfully")
            else:
                print("Failed to initialize admin data")
        finally:
            db.close()
    else:
        print("Failed to create admin tables")
