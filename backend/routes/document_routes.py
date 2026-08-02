import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from supabase import create_client
from models import db
from models.document import Document
from models.customer import Customer
from routes.decorators import roles_required
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

document_bp = Blueprint("documents", __name__)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def get_supabase_client():
    return create_client(
        current_app.config["SUPABASE_URL"], current_app.config["SUPABASE_KEY"]
    )


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@document_bp.route("", methods=["POST"])
@jwt_required()
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "no file provided (expected form field 'file')"}), 400

    file = request.files["file"]
    customer_id = request.form.get("customer_id")

    if not customer_id:
        return jsonify({"error": "customer_id is required"}), 400

    if file.filename == "":
        return jsonify({"error": "no file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"file type not allowed. Allowed types: {sorted(ALLOWED_EXTENSIONS)}"
        }), 400

    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404

    file_bytes = file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        return jsonify({"error": "file exceeds 10MB size limit"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    storage_path = f"customer_{customer_id}/{uuid.uuid4().hex}.{ext}"

    try:
        supabase = get_supabase_client()
        bucket = current_app.config["SUPABASE_BUCKET"]
        supabase.storage.from_(bucket).upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        return jsonify({"error": f"upload to storage failed: {str(e)}"}), 502

    document = Document(
        customer_id=customer_id,
        file_name=file.filename,
        file_path=storage_path,
    )
    db.session.add(document)
    db.session.commit()
    return jsonify({"document": document.to_dict()}), 201


@document_bp.route("", methods=["GET"])
@jwt_required()
def list_documents():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    query = Document.query

    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer:
            return jsonify({"documents": []}), 200
        query = query.filter_by(customer_id=customer.id)
    else:
        customer_id = request.args.get("customer_id")
        if customer_id:
            query = query.filter_by(customer_id=customer_id)

    documents = query.order_by(Document.uploaded_at.desc()).all()
    return jsonify({"documents": [d.to_dict() for d in documents]}), 200


@document_bp.route("/<int:document_id>/download", methods=["GET"])
@jwt_required()
def get_download_url(document_id):
    document = Document.query.get(document_id)
    if not document:
        return jsonify({"error": "document not found"}), 404

    identity = get_jwt_identity()
    role = get_jwt().get("role")
    if role == "customer":
        customer = Customer.query.filter_by(user_id=int(identity)).first()
        if not customer or document.customer_id != customer.id:
            return jsonify({"error": "forbidden"}), 403

    try:
        supabase = get_supabase_client()
        bucket = current_app.config["SUPABASE_BUCKET"]
        signed = supabase.storage.from_(bucket).create_signed_url(
            document.file_path, 3600  # valid for 1 hour
        )
        url = signed.get("signedURL") or signed.get("signedUrl")
        if not url:
            raise ValueError("no signed URL returned")
        return jsonify({"url": url, "file_name": document.file_name}), 200
    except Exception as e:
        return jsonify({"error": f"failed to generate download link: {str(e)}"}), 502


@document_bp.route("/<int:document_id>", methods=["DELETE"])
@roles_required("admin", "agent")
def delete_document(document_id):
    document = Document.query.get(document_id)
    if not document:
        return jsonify({"error": "document not found"}), 404

    try:
        supabase = get_supabase_client()
        bucket = current_app.config["SUPABASE_BUCKET"]
        supabase.storage.from_(bucket).remove([document.file_path])
    except Exception:
        pass  # even if storage delete fails, still remove the DB record

    db.session.delete(document)
    db.session.commit()
    return jsonify({"message": "document deleted"}), 200
