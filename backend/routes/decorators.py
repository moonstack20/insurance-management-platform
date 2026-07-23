from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def roles_required(*allowed_roles):
    """Restrict a route to one or more roles, e.g. @roles_required('admin', 'agent')"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "you do not have permission to access this resource"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
