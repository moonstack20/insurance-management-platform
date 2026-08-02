import random
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db
from models.policy import Policy
from models.customer import Customer
from routes.decorators import roles_required
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from utils_notify import notify

policy_bp = Blueprint("policies", __name__)

VALID_STATUSES = {"active", "expired", "cancelled"}


def generate_policy_number():
    return f"POL-{datetime.now().year}-{random.randint(100000, 999999)}"


def parse_date(value, field_name):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format")


@policy_bp.route("", methods=["POST"])
@roles_required("admin", "agent")
def create_policy():
    data = request.get_json(silent=True) or {}

    customer_id = data.get("customer_id")
    policy_type = data.get("policy_type", "").strip()
    premium_amount = data.get("premium_amount")
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    if not customer_id or not policy_type or premium_amount is None or not start_date_str or not end_date_str:
        return jsonify({"error": "customer_id, policy_type, premium_amount, start_date, and end_date are required"}), 400

    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404

    try:
        start_date = parse_date(start_date_str, "start_date")
        end_date = parse_date(end_date_str, "end_date")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if end_date <= start_date:
        return jsonify({"error": "end_date must be after start_date"}), 400

    try:
        premium_amount = float(premium_amount)
        if premium_amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "premium_amount must be a positive number"}), 400

    policy_number = generate_policy_number()
    while Policy.query.filter_by(policy_number=policy_number).first():
        policy_number = generate_policy_number()

    policy = Policy(
        customer_id=customer_id,
        policy_type=policy_type,
        policy_number=policy_number,
        premium_amount=premium_amount,
        start_date=start_date,
        end_date=end_date,
        status="active",
    )
    db.session.add(policy)
    db.session.flush()
    notify(f"New policy {policy.policy_number} created for {customer.name}", "policy_created")
    if customer.user_id:
        notify(f"Your new policy {policy.policy_number} has been created", "policy_created", user_id=customer.user_id)
    db.session.commit()
    return jsonify({"policy": policy.to_dict()}), 201


@policy_bp.route("", methods=["GET"])
@jwt_required()
def list_policies():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    query = Policy.query

    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer:
            return jsonify({"policies": []}), 200
        query = query.filter_by(customer_id=customer.id)
    else:
        customer_id = request.args.get("customer_id")
        if customer_id:
            query = query.filter_by(customer_id=customer_id)

    status = request.args.get("status")
    if status:
        if status not in VALID_STATUSES:
            return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
        query = query.filter_by(status=status)

    policies = query.order_by(Policy.start_date.desc()).all()
    return jsonify({"policies": [p.to_dict() for p in policies]}), 200


@policy_bp.route("/<int:policy_id>", methods=["GET"])
@jwt_required()
def get_policy(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    identity = get_jwt_identity()
    role = get_jwt().get("role")
    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer or policy.customer_id != customer.id:
            return jsonify({"error": "forbidden"}), 403

    return jsonify({"policy": policy.to_dict()}), 200


@policy_bp.route("/<int:policy_id>", methods=["PUT"])
@roles_required("admin", "agent")
def update_policy(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    data = request.get_json(silent=True) or {}

    if "policy_type" in data:
        if not data["policy_type"].strip():
            return jsonify({"error": "policy_type cannot be empty"}), 400
        policy.policy_type = data["policy_type"].strip()

    if "premium_amount" in data:
        try:
            amount = float(data["premium_amount"])
            if amount <= 0:
                raise ValueError
            policy.premium_amount = amount
        except (ValueError, TypeError):
            return jsonify({"error": "premium_amount must be a positive number"}), 400

    if "start_date" in data:
        try:
            policy.start_date = parse_date(data["start_date"], "start_date")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if "end_date" in data:
        try:
            policy.end_date = parse_date(data["end_date"], "end_date")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if policy.end_date <= policy.start_date:
        return jsonify({"error": "end_date must be after start_date"}), 400

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
        policy.status = data["status"]

    db.session.commit()
    return jsonify({"policy": policy.to_dict()}), 200


@policy_bp.route("/<int:policy_id>/renew", methods=["POST"])
@roles_required("admin", "agent")
def renew_policy(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    data = request.get_json(silent=True) or {}
    new_end_date_str = data.get("new_end_date")
    if not new_end_date_str:
        return jsonify({"error": "new_end_date is required"}), 400

    try:
        new_end_date = parse_date(new_end_date_str, "new_end_date")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if new_end_date <= policy.end_date:
        return jsonify({"error": "new_end_date must be after the current end_date"}), 400

    policy.end_date = new_end_date
    policy.status = "active"
    db.session.commit()
    return jsonify({"policy": policy.to_dict()}), 200


@policy_bp.route("/<int:policy_id>/cancel", methods=["POST"])
@roles_required("admin", "agent")
def cancel_policy(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if policy.status == "cancelled":
        return jsonify({"error": "policy is already cancelled"}), 400

    policy.status = "cancelled"
    db.session.commit()
    return jsonify({"policy": policy.to_dict()}), 200


@policy_bp.route("/<int:policy_id>", methods=["DELETE"])
@roles_required("admin")
def delete_policy(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404
    db.session.delete(policy)
    db.session.commit()
    return jsonify({"message": "policy deleted"}), 200
