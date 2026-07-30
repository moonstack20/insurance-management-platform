from datetime import date
from collections import OrderedDict
from flask import Blueprint, jsonify, request
from sqlalchemy import func
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.policy import Policy
from models.claim import Claim
from models.premium_payment import PremiumPayment
from models.customer import Customer
from models.user import User
from routes.decorators import roles_required

dashboard_bp = Blueprint("dashboard", __name__)


def _last_n_months(n=6):
    """(year, month) tuples for the last n months, oldest first."""
    months = []
    today = date.today()
    y, m = today.year, today.month
    for _ in range(n):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


@dashboard_bp.route("/admin", methods=["GET"])
@roles_required("admin", "agent")
def admin_dashboard():
    policy_counts = dict(
        db.session.query(Policy.status, func.count(Policy.id)).group_by(Policy.status).all()
    )
    total_policies = sum(policy_counts.values())

    claim_status_counts = dict(
        db.session.query(Claim.status, func.count(Claim.id)).group_by(Claim.status).all()
    )
    claim_risk_counts = dict(
        db.session.query(Claim.risk_level, func.count(Claim.id))
        .filter(Claim.risk_level.isnot(None))
        .group_by(Claim.risk_level)
        .all()
    )

    total_collected = db.session.query(func.coalesce(func.sum(PremiumPayment.amount), 0)) \
        .filter(PremiumPayment.payment_status == "paid").scalar()
    total_due = db.session.query(func.coalesce(func.sum(PremiumPayment.amount), 0)) \
        .filter(PremiumPayment.payment_status == "due").scalar()
    total_overdue = db.session.query(func.coalesce(func.sum(PremiumPayment.amount), 0)) \
        .filter(PremiumPayment.payment_status == "overdue").scalar()

    months = _last_n_months(6)
    monthly_premiums = OrderedDict((f"{y}-{m:02d}", 0.0) for y, m in months)
    payments = db.session.query(
        func.extract("year", PremiumPayment.payment_date),
        func.extract("month", PremiumPayment.payment_date),
        func.sum(PremiumPayment.amount),
    ).filter(PremiumPayment.payment_status == "paid").group_by(
        func.extract("year", PremiumPayment.payment_date),
        func.extract("month", PremiumPayment.payment_date),
    ).all()
    for y, m, total in payments:
        label = f"{int(y)}-{int(m):02d}"
        if label in monthly_premiums:
            monthly_premiums[label] = float(total)

    customer_growth = OrderedDict((f"{y}-{m:02d}", 0) for y, m in months)
    signups = db.session.query(
        func.extract("year", User.created_at),
        func.extract("month", User.created_at),
        func.count(User.id),
    ).filter(User.role == "customer").group_by(
        func.extract("year", User.created_at),
        func.extract("month", User.created_at),
    ).all()
    for y, m, count in signups:
        label = f"{int(y)}-{int(m):02d}"
        if label in customer_growth:
            customer_growth[label] = count

    return jsonify({
        "policies": {
            "total": total_policies,
            "active": policy_counts.get("active", 0),
            "expired": policy_counts.get("expired", 0),
            "cancelled": policy_counts.get("cancelled", 0),
        },
        "claims": {
            "byStatus": {
                "pending": claim_status_counts.get("pending", 0),
                "approved": claim_status_counts.get("approved", 0),
                "rejected": claim_status_counts.get("rejected", 0),
            },
            "byRisk": {
                "Low": claim_risk_counts.get("Low", 0),
                "Medium": claim_risk_counts.get("Medium", 0),
                "High": claim_risk_counts.get("High", 0),
            },
        },
        "premiums": {
            "totalCollected": float(total_collected),
            "totalDue": float(total_due),
            "totalOverdue": float(total_overdue),
            "monthly": [{"month": k, "amount": v} for k, v in monthly_premiums.items()],
        },
        "customers": {
            "total": Customer.query.count(),
            "growth": [{"month": k, "count": v} for k, v in customer_growth.items()],
        },
    }), 200


@dashboard_bp.route("/customer", methods=["GET"])
@jwt_required()
def customer_dashboard():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
    else:
        customer_id = request.args.get("customer_id")
        if not customer_id:
            return jsonify({"error": "customer_id is required"}), 400
        customer = Customer.query.get(customer_id)

    if not customer:
        return jsonify({"error": "customer not found"}), 404

    policies = Policy.query.filter_by(customer_id=customer.id).all()
    policy_ids = [p.id for p in policies]
    active_count = sum(1 for p in policies if p.status == "active")

    claims = Claim.query.filter(Claim.policy_id.in_(policy_ids)).all() if policy_ids else []
    claim_status_counts = {"pending": 0, "approved": 0, "rejected": 0}
    for c in claims:
        if c.status in claim_status_counts:
            claim_status_counts[c.status] += 1

    payments = PremiumPayment.query.filter(PremiumPayment.policy_id.in_(policy_ids)).all() if policy_ids else []
    total_paid = sum(float(p.amount) for p in payments if p.payment_status == "paid")
    total_due = sum(float(p.amount) for p in payments if p.payment_status in ("due", "overdue"))

    today = date.today()
    upcoming_expiries = [
        {"policy_number": p.policy_number, "end_date": p.end_date.isoformat(),
         "days_left": (p.end_date - today).days}
        for p in policies if p.status == "active" and 0 <= (p.end_date - today).days <= 30
    ]

    return jsonify({
        "policies": {"total": len(policies), "active": active_count},
        "claims": claim_status_counts,
        "premiums": {"totalPaid": total_paid, "totalDue": total_due},
        "upcomingExpiries": upcoming_expiries,
    }), 200
