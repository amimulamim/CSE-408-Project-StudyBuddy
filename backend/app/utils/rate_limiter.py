"""
Simple in-memory rate limiter for profile operations.
In production, you would use Redis or a more sophisticated rate limiting library.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple
from threading import Lock
import threading

class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window.
    """
    
    def __init__(self, max_requests: int = 5, time_window_minutes: int = 1):
        self.max_requests = max_requests
        self.time_window = timedelta(minutes=time_window_minutes)
        self.requests: Dict[str, list] = {}
        self.lock = threading.Lock()
    
    def is_allowed(self, user_id: str) -> Tuple[bool, int]:
        """
        Check if user is allowed to make a request.
        
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        with self.lock:
            now = datetime.now(timezone.utc)
            cutoff_time = now - self.time_window
            
            # Initialize user if not exists
            if user_id not in self.requests:
                self.requests[user_id] = []
            
            # Remove old requests outside the time window
            self.requests[user_id] = [
                req_time for req_time in self.requests[user_id] 
                if req_time > cutoff_time
            ]
            
            # Check if under the limit
            current_count = len(self.requests[user_id])
            if current_count < self.max_requests:
                self.requests[user_id].append(now)
                return True, self.max_requests - current_count - 1
            else:
                return False, 0
    
    def get_reset_time(self, user_id: str) -> datetime:
        """
        Get when the rate limit will reset for a user.
        """
        with self.lock:
            if user_id not in self.requests or not self.requests[user_id]:
                return datetime.now(timezone.utc)
            
            # Find the oldest request that's still within the window
            oldest_request = min(self.requests[user_id])
            reset_time = oldest_request + self.time_window
            return reset_time


# Global rate limiter instances for different operations
profile_rate_limiter = RateLimiter(max_requests=10, time_window_minutes=1)
email_change_rate_limiter = RateLimiter(max_requests=3, time_window_minutes=60)


def check_profile_rate_limit(user_id: str) -> Tuple[bool, int]:
    """Check rate limit for profile operations"""
    return profile_rate_limiter.is_allowed(user_id)


def check_email_change_rate_limit(user_id: str) -> Tuple[bool, int]:
    """Check rate limit for email change operations"""
    return email_change_rate_limiter.is_allowed(user_id)
