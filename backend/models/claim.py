from datetime import datetime, timezone
from . import db


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=False)
    claim_amount = db.Column(db.Numeric(10, 2), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending | approved | rejected
    submission_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # AI risk scoring (Groq) - filled in on Day 7
    risk_level = db.Column(db.String(10), nullable=True)  # Low | Medium | High
    risk_reason = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "policy_id": self.policy_id,
            "claim_amount": float(self.claim_amount),
            "reason": self.reason,
            "status": self.status,
            "submission_date": self.submission_date.isoformat(),
            "risk_level": self.risk_level,
            "risk_reason": self.risk_reason,
        }
