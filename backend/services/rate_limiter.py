import time
import threading
from typing import Dict, List

class InMemoryRateLimiter:
    def __init__(self, limit_email: int = 5, limit_ip: int = 20, window_seconds: int = 900):
        self.limit_email = limit_email
        self.limit_ip = limit_ip
        self.window_seconds = window_seconds
        self.lock = threading.Lock()
        
        # Maps target email to list of timestamps of failed attempts
        self.email_attempts: Dict[str, List[float]] = {}
        
        # Maps client IP to list of timestamps of failed attempts
        self.ip_attempts: Dict[str, List[float]] = {}

    def _clean_old_attempts(self, attempts_list: List[float], now: float) -> List[float]:
        """Filter out attempts older than the window duration."""
        cutoff = now - self.window_seconds
        return [t for t in attempts_list if t > cutoff]

    def is_email_blocked(self, email: str) -> bool:
        """Check if the given email has exceeded the allowed failed attempts."""
        if not email:
            return False
        now = time.time()
        email_clean = email.strip().lower()
        with self.lock:
            if email_clean in self.email_attempts:
                self.email_attempts[email_clean] = self._clean_old_attempts(self.email_attempts[email_clean], now)
                if not self.email_attempts[email_clean]:
                    del self.email_attempts[email_clean]
                elif len(self.email_attempts[email_clean]) >= self.limit_email:
                    return True
        return False

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if the given IP address has exceeded the allowed failed attempts."""
        if not ip:
            return False
        now = time.time()
        with self.lock:
            if ip in self.ip_attempts:
                self.ip_attempts[ip] = self._clean_old_attempts(self.ip_attempts[ip], now)
                if not self.ip_attempts[ip]:
                    del self.ip_attempts[ip]
                elif len(self.ip_attempts[ip]) >= self.limit_ip:
                    return True
        return False

    def add_failed_attempt(self, email: str, ip: str):
        """Record a failed login attempt for both the target email and client IP."""
        now = time.time()
        with self.lock:
            if email:
                email_clean = email.strip().lower()
                if email_clean not in self.email_attempts:
                    self.email_attempts[email_clean] = []
                self.email_attempts[email_clean].append(now)
                self.email_attempts[email_clean] = self._clean_old_attempts(self.email_attempts[email_clean], now)
                
            if ip:
                if ip not in self.ip_attempts:
                    self.ip_attempts[ip] = []
                self.ip_attempts[ip].append(now)
                self.ip_attempts[ip] = self._clean_old_attempts(self.ip_attempts[ip], now)

    def reset_email_attempts(self, email: str):
        """Reset the failed attempts counter for a specific email address (on successful login)."""
        if not email:
            return
        email_clean = email.strip().lower()
        with self.lock:
            if email_clean in self.email_attempts:
                del self.email_attempts[email_clean]

# Global instance to be imported and used in the routes
login_rate_limiter = InMemoryRateLimiter()
