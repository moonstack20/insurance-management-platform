from models import db
from models.notification import Notification


def notify(message, notif_type, user_id=None):
    """Create a notification. user_id=None means broadcast to admin/agent."""
    n = Notification(message=message, notif_type=notif_type, user_id=user_id)
    db.session.add(n)
