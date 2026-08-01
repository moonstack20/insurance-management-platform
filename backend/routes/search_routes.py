from flask import Blueprint, jsonify, request
from routes.decorators import roles_required
from models.customer import Customer
from models.policy import Policy
from models.claim import Claim

search_bp = Blueprint("search", __name__)


@search_bp.route("", methods=["GET"])
@roles_required("admin", "agent")
def global_search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({"customers": [], "policies": [], "claims": []}), 200

    like = f"%{q}%"

    customers = Customer.query.filter(
        (Customer.name.ilike(like))
        | (Customer.phone.ilike(like))
        | (Customer.email.ilike(like))
    ).limit(10).all()

    policies = Policy.query.filter(
        (Policy.policy_number.ilike(like)) | (Policy.policy_type.ilike(like))
    ).limit(10).all()

    claims = Claim.query.filter(Claim.reason.ilike(like)).limit(10).all()

    return jsonify({
        "customers": [c.to_dict() for c in customers],
        "policies": [p.to_dict() for p in policies],
        "claims": [c.to_dict() for c in claims],
    }), 200
