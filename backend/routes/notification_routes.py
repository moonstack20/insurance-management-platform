from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.notification import Notification

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    if role == "customer":
        query = Notification.query.filter_by(user_id=int(identity))
    else:
        # admin/agent see broadcast notifications (user_id is null)
        query = Notification.query.filter_by(user_id=None)

    notifications = query.order_by(Notification.created_at.desc()).limit(30).all()
    unread_count = query.filter_by(is_read=False).count()

    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
    }), 200


@notification_bp.route("/<int:notif_id>/read", methods=["POST"])
@jwt_required()
def mark_read(notif_id):
    notif = Notification.query.get(notif_id)
    if not notif:
        return jsonify({"error": "notification not found"}), 404
    notif.is_read = True
    db.session.commit()
    return jsonify({"notification": notif.to_dict()}), 200


@notification_bp.route("/read-all", methods=["POST"])
@jwt_required()
def mark_all_read():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    if role == "customer":
        query = Notification.query.filter_by(user_id=int(identity), is_read=False)
    else:
        query = Notification.query.filter_by(user_id=None, is_read=False)

    query.update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "all marked read"}), 200
