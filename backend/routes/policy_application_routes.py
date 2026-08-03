import random
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.policy_application import PolicyApplication
from models.policy import Policy
from models.customer import Customer
from routes.decorators import roles_required
from utils_notify import notify

policy_application_bp = Blueprint("policy_applications", __name__)

VALID_STATUSES = {"pending", "approved", "rejected"}


def generate_policy_number():
    return f"POL-{datetime.now().year}-{random.randint(100000, 999999)}"


@policy_application_bp.route("", methods=["POST"])
@jwt_required()
def submit_application():
    identity = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=int(identity)).first()
    if not customer:
        return jsonify({"error": "no customer profile found for this account"}), 404

    data = request.get_json(silent=True) or {}

    policy_type = data.get("policy_type", "").strip()
    coverage_amount = data.get("coverage_amount")
    nominee_name = data.get("nominee_name", "").strip()
    duration_months = data.get("duration_months")
    medical_history = data.get("medical_history", "").strip()

    if not policy_type or coverage_amount is None or not duration_months:
        return jsonify({"error": "policy_type, coverage_amount, and duration_months are required"}), 400

    try:
        coverage_amount = float(coverage_amount)
        if coverage_amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "coverage_amount must be a positive number"}), 400

    try:
        duration_months = int(duration_months)
        if duration_months <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "duration_months must be a positive integer"}), 400

    application = PolicyApplication(
        customer_id=customer.id,
        policy_type=policy_type,
        coverage_amount=coverage_amount,
        nominee_name=nominee_name or None,
        duration_months=duration_months,
        medical_history=medical_history or None,
        status="pending",
    )
    db.session.add(application)
    db.session.flush()

    notify(f"New policy application from {customer.name} ({policy_type})", "policy_application")

    db.session.commit()
    return jsonify({"application": application.to_dict()}), 201


@policy_application_bp.route("", methods=["GET"])
@jwt_required()
def list_applications():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    query = PolicyApplication.query

    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer:
            return jsonify({"applications": []}), 200
        query = query.filter_by(customer_id=customer.id)
    else:
        status = request.args.get("status")
        if status:
            if status not in VALID_STATUSES:
                return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
            query = query.filter_by(status=status)

    applications = query.order_by(PolicyApplication.submitted_at.desc()).all()
    return jsonify({"applications": [a.to_dict() for a in applications]}), 200


@policy_application_bp.route("/<int:application_id>/approve", methods=["POST"])
@roles_required("admin", "agent")
def approve_application(application_id):
    application = PolicyApplication.query.get(application_id)
    if not application:
        return jsonify({"error": "application not found"}), 404
    if application.status != "pending":
        return jsonify({"error": "only pending applications can be approved"}), 400

    customer = Customer.query.get(application.customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404

    policy_number = generate_policy_number()
    while Policy.query.filter_by(policy_number=policy_number).first():
        policy_number = generate_policy_number()

    start_date = date.today()
    end_date = start_date + timedelta(days=application.duration_months * 30)

    policy = Policy(
        customer_id=customer.id,
        policy_type=application.policy_type,
        policy_number=policy_number,
        premium_amount=round(float(application.coverage_amount) * 0.02, 2),
        coverage_amount=application.coverage_amount,
        start_date=start_date,
        end_date=end_date,
        status="active",
    )
    db.session.add(policy)
    db.session.flush()

    application.status = "approved"
    application.resulting_policy_id = policy.id

    notify(f"Policy application approved — {policy.policy_number} created", "policy_application_approved")
    if customer.user_id:
        notify(
            f"Your policy application has been approved. Policy {policy.policy_number} is now active.",
            "policy_application_approved",
            user_id=customer.user_id,
        )

    db.session.commit()
    return jsonify({"application": application.to_dict(), "policy": policy.to_dict()}), 200


@policy_application_bp.route("/<int:application_id>/reject", methods=["POST"])
@roles_required("admin", "agent")
def reject_application(application_id):
    application = PolicyApplication.query.get(application_id)
    if not application:
        return jsonify({"error": "application not found"}), 404
    if application.status != "pending":
        return jsonify({"error": "only pending applications can be rejected"}), 400

    application.status = "rejected"

    customer = Customer.query.get(application.customer_id)
    notify(f"Policy application rejected for {customer.name if customer else 'customer'}", "policy_application_rejected")
    if customer and customer.user_id:
        notify(
            "Your policy application was not approved. Contact support for details.",
            "policy_application_rejected",
            user_id=customer.user_id,
        )

    db.session.commit()
    return jsonify({"application": application.to_dict()}), 200
