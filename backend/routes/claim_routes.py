import os
from flask import Blueprint, request, jsonify
from models import db
from models.claim import Claim
from models.policy import Policy
from routes.decorators import roles_required
from flask_jwt_extended import jwt_required
from utils_notify import notify

claim_bp = Blueprint("claims", __name__)

VALID_STATUSES = {"pending", "approved", "rejected"}
VALID_RISK_LEVELS = {"Low", "Medium", "High"}


def score_claim_risk(claim_amount, premium_amount, reason):
    """Call Groq to get a risk level + short reason. Falls back to a rule-based
    score if Groq is unavailable or the key isn't set, so claim submission never breaks."""
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an insurance claim risk assessor. Given claim details, "
                            "respond with EXACTLY two lines:\n"
                            "Line 1: Low, Medium, or High\n"
                            "Line 2: a one-sentence reason (under 20 words)"
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Claim amount: {claim_amount}, Policy premium: {premium_amount}, "
                            f"Reason: {reason}"
                        ),
                    },
                ],
                max_tokens=60,
                timeout=8,
            )
            text = response.choices[0].message.content.strip()
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            level = lines[0].strip(".:")
            reason_line = lines[1] if len(lines) > 1 else "AI-generated risk assessment."
            if level in VALID_RISK_LEVELS:
                return level, reason_line[:255]
        except Exception:
            pass  # fall through to rule-based fallback

    # Rule-based fallback: compare claim amount to premium
    try:
        ratio = float(claim_amount) / float(premium_amount) if premium_amount else 0
    except (ValueError, ZeroDivisionError):
        ratio = 0
    if ratio >= 3:
        return "High", "Claim amount is significantly higher than the policy premium."
    elif ratio >= 1:
        return "Medium", "Claim amount is comparable to the policy premium."
    else:
        return "Low", "Claim amount is well within the policy premium range."


def generate_claim_summary(claim, policy):
    """Call Groq to produce a short human-readable claim summary + recommendation.
    Falls back to a simple templated summary if Groq is unavailable."""
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an insurance claims assistant. Given claim details, "
                            "write a concise 2-3 sentence summary covering what happened, "
                            "whether coverage looks available, and a recommendation "
                            "(Approve, Reject, or Needs Review). Plain text, no markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Policy type: {policy.policy_type}, Premium: {policy.premium_amount}, "
                            f"Claim amount: {claim.claim_amount}, Reason: {claim.reason}, "
                            f"Risk level: {claim.risk_level}"
                        ),
                    },
                ],
                max_tokens=120,
                timeout=8,
            )
            return response.choices[0].message.content.strip()[:500]
        except Exception:
            pass

    return (
        f"Claim of {claim.claim_amount} filed for '{claim.reason}' under a "
        f"{policy.policy_type} policy. Risk level: {claim.risk_level or 'Unassessed'}. "
        f"Recommendation: Needs Review."
    )


def generate_claim_summary(claim, policy):
    """Call Groq to produce a short human-readable claim summary + recommendation.
    Falls back to a simple templated summary if Groq is unavailable."""
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an insurance claims assistant. Given claim details, "
                            "write a concise 2-3 sentence summary covering what happened, "
                            "whether coverage looks available, and a recommendation "
                            "(Approve, Reject, or Needs Review). Plain text, no markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Policy type: {policy.policy_type}, Premium: {policy.premium_amount}, "
                            f"Claim amount: {claim.claim_amount}, Reason: {claim.reason}, "
                            f"Risk level: {claim.risk_level}"
                        ),
                    },
                ],
                max_tokens=120,
                timeout=8,
            )
            return response.choices[0].message.content.strip()[:500]
        except Exception:
            pass

    return (
        f"Claim of {claim.claim_amount} filed for '{claim.reason}' under a "
        f"{policy.policy_type} policy. Risk level: {claim.risk_level or 'Unassessed'}. "
        f"Recommendation: Needs Review."
    )


def generate_claim_summary(claim, policy):
    """Call Groq to produce a short human-readable claim summary + recommendation.
    Falls back to a simple templated summary if Groq is unavailable."""
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an insurance claims assistant. Given claim details, "
                            "write a concise 2-3 sentence summary covering what happened, "
                            "whether coverage looks available, and a recommendation "
                            "(Approve, Reject, or Needs Review). Plain text, no markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Policy type: {policy.policy_type}, Premium: {policy.premium_amount}, "
                            f"Claim amount: {claim.claim_amount}, Reason: {claim.reason}, "
                            f"Risk level: {claim.risk_level}"
                        ),
                    },
                ],
                max_tokens=120,
                timeout=8,
            )
            return response.choices[0].message.content.strip()[:500]
        except Exception:
            pass

    return (
        f"Claim of {claim.claim_amount} filed for '{claim.reason}' under a "
        f"{policy.policy_type} policy. Risk level: {claim.risk_level or 'Unassessed'}. "
        f"Recommendation: Needs Review."
    )


@claim_bp.route("", methods=["POST"])
@jwt_required()
def submit_claim():
    data = request.get_json(silent=True) or {}

    policy_id = data.get("policy_id")
    claim_amount = data.get("claim_amount")
    reason = data.get("reason", "").strip()

    if not policy_id or claim_amount is None or not reason:
        return jsonify({"error": "policy_id, claim_amount, and reason are required"}), 400

    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if policy.status != "active":
        return jsonify({"error": "claims can only be submitted for active policies"}), 400

    try:
        claim_amount = float(claim_amount)
        if claim_amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "claim_amount must be a positive number"}), 400

    risk_level, risk_reason = score_claim_risk(claim_amount, float(policy.premium_amount), reason)

    claim = Claim(
        policy_id=policy_id,
        claim_amount=claim_amount,
        reason=reason,
        status="pending",
        risk_level=risk_level,
        risk_reason=risk_reason,
    )
    db.session.add(claim)
    db.session.commit()
    return jsonify({"claim": claim.to_dict()}), 201


@claim_bp.route("", methods=["GET"])
@jwt_required()
def list_claims():
    query = Claim.query

    policy_id = request.args.get("policy_id")
    if policy_id:
        query = query.filter_by(policy_id=policy_id)

    status = request.args.get("status")
    if status:
        if status not in VALID_STATUSES:
            return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
        query = query.filter_by(status=status)

    claims = query.order_by(Claim.submission_date.desc()).all()
    return jsonify({"claims": [c.to_dict() for c in claims]}), 200


@claim_bp.route("/<int:claim_id>", methods=["GET"])
@jwt_required()
def get_claim(claim_id):
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({"error": "claim not found"}), 404
    return jsonify({"claim": claim.to_dict()}), 200


@claim_bp.route("/<int:claim_id>/summary", methods=["POST"])
@roles_required("admin", "agent")
def generate_summary(claim_id):
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({"error": "claim not found"}), 404

    policy = Policy.query.get(claim.policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    claim.ai_summary = generate_claim_summary(claim, policy)
    db.session.commit()
    return jsonify({"claim": claim.to_dict()}), 200


@claim_bp.route("/<int:claim_id>/approve", methods=["POST"])
@roles_required("admin", "agent")
def approve_claim(claim_id):
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({"error": "claim not found"}), 404
    if claim.status != "pending":
        return jsonify({"error": "only pending claims can be approved"}), 400
    claim.status = "approved"
    policy = Policy.query.get(claim.policy_id)
    notify(f"Claim #{claim.id} approved", "claim_approved")
    if policy:
        from models.customer import Customer
        customer = Customer.query.get(policy.customer_id)
        if customer and customer.user_id:
            notify(f"Your claim #{claim.id} has been approved", "claim_approved", user_id=customer.user_id)
    db.session.commit()
    return jsonify({"claim": claim.to_dict()}), 200


@claim_bp.route("/<int:claim_id>/reject", methods=["POST"])
@roles_required("admin", "agent")
def reject_claim(claim_id):
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({"error": "claim not found"}), 404
    if claim.status != "pending":
        return jsonify({"error": "only pending claims can be rejected"}), 400
    claim.status = "rejected"
    policy = Policy.query.get(claim.policy_id)
    notify(f"Claim #{claim.id} rejected", "claim_rejected")
    if policy:
        from models.customer import Customer
        customer = Customer.query.get(policy.customer_id)
        if customer and customer.user_id:
            notify(f"Your claim #{claim.id} has been rejected", "claim_rejected", user_id=customer.user_id)
    db.session.commit()
    return jsonify({"claim": claim.to_dict()}), 200


@claim_bp.route("/<int:claim_id>", methods=["DELETE"])
@roles_required("admin")
def delete_claim(claim_id):
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({"error": "claim not found"}), 404
    db.session.delete(claim)
    db.session.commit()
    return jsonify({"message": "claim deleted"}), 200
