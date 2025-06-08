from datetime import datetime, timezone
from typing import Dict, Any, Optional
import re

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_user_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input for admin operations"""
    if not text:
        return ""
    
    # Remove any potentially harmful characters
    sanitized = re.sub(r'[<>"\']', '', text)
    
    # Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized.strip()

def format_admin_action_details(action_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
    """Format admin action details for logging"""
    formatted = {
        "action": action_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details
    }
    return formatted

def validate_datetime_range(start_time: datetime, end_time: datetime) -> bool:
    """Validate that datetime range is valid"""
    if start_time >= end_time:
        return False
    
    # Don't allow ranges longer than 1 year
    max_days = 365
    if (end_time - start_time).days > max_days:
        return False
    
    return True

def mask_sensitive_data(data: Dict[str, Any], sensitive_fields: list = None) -> Dict[str, Any]:
    """Mask sensitive data in dictionaries for logging"""
    if sensitive_fields is None:
        sensitive_fields = ['password', 'token', 'secret', 'key', 'email']
    
    masked_data = data.copy()
    for field in sensitive_fields:
        if field in masked_data:
            value = str(masked_data[field])
            if len(value) > 4:
                masked_data[field] = value[:2] + '*' * (len(value) - 4) + value[-2:]
            else:
                masked_data[field] = '*' * len(value)
    
    return masked_data

def generate_admin_summary(stats: Dict[str, int]) -> str:
    """Generate a summary string for admin statistics"""
    total_actions = sum(stats.values())
    if total_actions == 0:
        return "No administrative actions performed"
    
    summary_parts = []
    for action, count in stats.items():
        if count > 0:
            summary_parts.append(f"{action}: {count}")
    
    return f"Total: {total_actions} actions ({', '.join(summary_parts)})"
