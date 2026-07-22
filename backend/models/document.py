from datetime import datetime, timezone
from . import db


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)  # Supabase Storage path
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "uploaded_at": self.uploaded_at.isoformat(),
        }
