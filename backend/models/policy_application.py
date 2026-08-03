from datetime import datetime, timezone
from . import db


class PolicyApplication(db.Model):
    __tablename__ = "policy_applications"
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    policy_type = db.Column(db.String(50), nullable=False)
    coverage_amount = db.Column(db.Numeric(12, 2), nullable=False)
    nominee_name = db.Column(db.String(120), nullable=True)
    duration_months = db.Column(db.Integer, nullable=False)
    medical_history = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending | approved | rejected
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resulting_policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "policy_type": self.policy_type,
            "coverage_amount": float(self.coverage_amount),
            "nominee_name": self.nominee_name,
            "duration_months": self.duration_months,
            "medical_history": self.medical_history,
            "status": self.status,
            "submitted_at": self.submitted_at.isoformat(),
            "resulting_policy_id": self.resulting_policy_id,
        }
