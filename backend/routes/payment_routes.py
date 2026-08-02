from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db
from models.premium_payment import PremiumPayment
from models.policy import Policy
from models.customer import Customer
from routes.decorators import roles_required
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

payment_bp = Blueprint("payments", __name__)

VALID_STATUSES = {"paid", "due", "overdue"}


def parse_date(value, field_name):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format")


@payment_bp.route("", methods=["POST"])
@roles_required("admin", "agent")
def create_payment():
    data = request.get_json(silent=True) or {}

    policy_id = data.get("policy_id")
    amount = data.get("amount")
    payment_date_str = data.get("payment_date")
    payment_status = data.get("payment_status", "paid")

    if not policy_id or amount is None or not payment_date_str:
        return jsonify({"error": "policy_id, amount, and payment_date are required"}), 400

    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if payment_status not in VALID_STATUSES:
        return jsonify({"error": f"payment_status must be one of {sorted(VALID_STATUSES)}"}), 400

    try:
        payment_date = parse_date(payment_date_str, "payment_date")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be a positive number"}), 400

    payment = PremiumPayment(
        policy_id=policy_id,
        payment_date=payment_date,
        amount=amount,
        payment_status=payment_status,
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({"payment": payment.to_dict()}), 201


@payment_bp.route("", methods=["GET"])
@jwt_required()
def list_payments():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    query = PremiumPayment.query.join(Policy, PremiumPayment.policy_id == Policy.id)

    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer:
            return jsonify({"payments": []}), 200
        query = query.filter(Policy.customer_id == customer.id)
    else:
        policy_id = request.args.get("policy_id")
        if policy_id:
            query = query.filter(PremiumPayment.policy_id == policy_id)

    status = request.args.get("payment_status")
    if status:
        if status not in VALID_STATUSES:
            return jsonify({"error": f"payment_status must be one of {sorted(VALID_STATUSES)}"}), 400
        query = query.filter(PremiumPayment.payment_status == status)

    payments = query.order_by(PremiumPayment.payment_date.desc()).all()
    return jsonify({"payments": [p.to_dict() for p in payments]}), 200


@payment_bp.route("/<int:payment_id>", methods=["GET"])
@jwt_required()
def get_payment(payment_id):
    payment = PremiumPayment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "payment not found"}), 404

    identity = get_jwt_identity()
    role = get_jwt().get("role")
    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        policy = Policy.query.get(payment.policy_id)
        if not customer or not policy or policy.customer_id != customer.id:
            return jsonify({"error": "forbidden"}), 403

    return jsonify({"payment": payment.to_dict()}), 200


@payment_bp.route("/<int:payment_id>", methods=["PUT"])
@roles_required("admin", "agent")
def update_payment(payment_id):
    payment = PremiumPayment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "payment not found"}), 404

    data = request.get_json(silent=True) or {}

    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                raise ValueError
            payment.amount = amount
        except (ValueError, TypeError):
            return jsonify({"error": "amount must be a positive number"}), 400

    if "payment_date" in data:
        try:
            payment.payment_date = parse_date(data["payment_date"], "payment_date")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if "payment_status" in data:
        if data["payment_status"] not in VALID_STATUSES:
            return jsonify({"error": f"payment_status must be one of {sorted(VALID_STATUSES)}"}), 400
        payment.payment_status = data["payment_status"]

    db.session.commit()
    return jsonify({"payment": payment.to_dict()}), 200


@payment_bp.route("/<int:payment_id>/pay", methods=["POST"])
@jwt_required()
def mark_paid(payment_id):
    """Mock 'pay now' action - marks a due/overdue payment as paid."""
    payment = PremiumPayment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "payment not found"}), 404

    if payment.payment_status == "paid":
        return jsonify({"error": "payment is already marked as paid"}), 400

    payment.payment_status = "paid"
    db.session.commit()
    return jsonify({"payment": payment.to_dict()}), 200


@payment_bp.route("/<int:payment_id>", methods=["DELETE"])
@roles_required("admin")
def delete_payment(payment_id):
    payment = PremiumPayment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "payment not found"}), 404
    db.session.delete(payment)
    db.session.commit()
    return jsonify({"message": "payment deleted"}), 200
