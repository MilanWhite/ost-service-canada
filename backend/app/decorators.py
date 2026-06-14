from functools import wraps
from time import perf_counter
from flask import request
from app.config import Config
from app.utils import error_response
from app.verify_tokens import verify_jwt


def time_api_call(name: str | None = None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not Config.PAGE_TIMERS_ENABLED:
                return f(*args, **kwargs)

            started_at = perf_counter()
            try:
                return f(*args, **kwargs)
            finally:
                elapsed_ms = (perf_counter() - started_at) * 1000
                api_name = name or request.endpoint or f.__name__

                print(
                    f"[api_timer] api={api_name} "
                    f"method={request.method} path={request.path} "
                    f"elapsed_ms={elapsed_ms:.2f}"
                )

        return wrapper
    return decorator

def cognito_auth_required(required_groups: list[str] | None = None):
    # Decorator to verify a Cognito JWT and enforce Cognito-group membership.

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")

            if not auth_header.startswith("Bearer "):
                return error_response("Missing token", 401)

            token = auth_header.split()[1]

            try:
                claims = verify_jwt(token)
                request.user = claims
            except Exception as e:
                return error_response("Invalid token", 401)

            if required_groups:
                user_groups = claims.get("cognito:groups", [])
                if not any(g in user_groups for g in required_groups):
                    return error_response("Forbidden: insufficient group", 403)

            return f(*args, **kwargs)
        return wrapper
    return decorator
