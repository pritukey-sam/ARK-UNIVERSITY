import time
import threading
from typing import Dict

class AccountLockoutManager:
    def __init__(self, limit: int = 10, lock_duration_seconds: int = 1800):
        self.limit = limit
        self.lock_duration_seconds = lock_duration_seconds
        self.lock = threading.Lock()
        
        # email -> failed_attempts_count
        self.failed_attempts: Dict[str, int] = {}
        
        # email -> lock_expiration_timestamp (UNIX timestamp)
        self.lock_expirations: Dict[str, float] = {}
        
        # email -> last_activity_timestamp (for cleanup purposes)
        self.last_activity: Dict[str, float] = {}

    def _cleanup_expired(self, now: float):
        """Clean up keys that haven't had any activity for 24 hours to prevent memory leaks."""
        cleanup_window = 86400  # 24 hours
        expired_keys = []
        for email, last_active in list(self.last_activity.items()):
            # If currently locked, don't clean it up
            is_locked_now = email in self.lock_expirations and now < self.lock_expirations[email]
            if not is_locked_now and (now - last_active > cleanup_window):
                expired_keys.append(email)
                
        for email in expired_keys:
            self.failed_attempts.pop(email, None)
            self.lock_expirations.pop(email, None)
            self.last_activity.pop(email, None)

    def is_locked(self, email: str, db=None) -> bool:
        """
        Check if the email is currently locked.
        If the lockout duration has expired, automatically unlock the account,
        reset its failed attempts, log ACCOUNT_UNLOCKED to DB audit logs, and return False.
        """
        if not email:
            return False
        email_clean = email.strip().lower()
        now = time.time()
        
        with self.lock:
            self._cleanup_expired(now)
            
            expiration = self.lock_expirations.get(email_clean, 0.0)
            if expiration > 0:
                if now < expiration:
                    return True
                else:
                    # Lock expired! Automatic unlock
                    del self.lock_expirations[email_clean]
                    self.failed_attempts[email_clean] = 0
                    self.last_activity[email_clean] = now
                    
                    if db:
                        from database import log_audit_event
                        log_audit_event(
                            db,
                            action="ACCOUNT_UNLOCKED",
                            target=email_clean,
                            details="Account automatically unlocked after lockout expiration"
                        )
                        print(f"[SECURITY-AUDIT] ACCOUNT_UNLOCKED | Email: {email_clean}", flush=True)
            return False

    def add_failed_attempt(self, email: str) -> bool:
        """
        Increment the failed attempts counter.
        Locks the account for 30 minutes if the 10th attempt fails.
        Returns True if the lockout is triggered on this failure, False otherwise.
        """
        if not email:
            return False
        email_clean = email.strip().lower()
        now = time.time()
        
        with self.lock:
            self._cleanup_expired(now)
            
            # If already locked, do not increment further
            if email_clean in self.lock_expirations and now < self.lock_expirations[email_clean]:
                return False
                
            self.failed_attempts[email_clean] = self.failed_attempts.get(email_clean, 0) + 1
            self.last_activity[email_clean] = now
            
            if self.failed_attempts[email_clean] >= self.limit:
                self.lock_expirations[email_clean] = now + self.lock_duration_seconds
                return True
            return False

    def reset_attempts(self, email: str):
        """Reset the failed attempts counter and clear lockouts for the email."""
        if not email:
            return
        email_clean = email.strip().lower()
        now = time.time()
        with self.lock:
            self.failed_attempts[email_clean] = 0
            self.lock_expirations.pop(email_clean, None)
            self.last_activity[email_clean] = now

    def get_remaining_lock_time(self, email: str) -> float:
        """Return remaining lock duration in seconds."""
        if not email:
            return 0.0
        email_clean = email.strip().lower()
        now = time.time()
        with self.lock:
            expiration = self.lock_expirations.get(email_clean, 0.0)
            if expiration > now:
                return expiration - now
            return 0.0

# Global instance to be imported and used in the routes
account_lockout_manager = AccountLockoutManager()
