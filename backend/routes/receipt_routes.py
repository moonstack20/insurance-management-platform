import io
from datetime import date
from flask import Blueprint, send_file, jsonify
from flask_jwt_extended import jwt_required
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from models.premium_payment import PremiumPayment
from models.policy import Policy
from models.customer import Customer

receipt_bp = Blueprint("receipts", __name__)


@receipt_bp.route("/payment/<int:payment_id>", methods=["GET"])
@jwt_required()
def payment_receipt(payment_id):
    payment = PremiumPayment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "payment not found"}), 404

    policy = Policy.query.get(payment.policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    customer = Customer.query.get(policy.customer_id)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=25 * mm, bottomMargin=25 * mm,
        leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"], fontSize=18,
        textColor=colors.HexColor("#1e3a8a"),
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"], textColor=colors.HexColor("#64748b"),
        fontSize=9,
    )

    story = []
    story.append(Paragraph("Premium Payment Receipt", title_style))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "Insurance Management Platform", label_style
    ))
    story.append(Spacer(1, 8 * mm))

    info_data = [
        ["Receipt No.", f"RCPT-{payment.id:06d}"],
        ["Payment Date", payment.payment_date.strftime("%d %b %Y")],
        ["Generated On", date.today().strftime("%d %b %Y")],
        ["Customer Name", customer.name if customer else "-"],
        ["Policy Number", policy.policy_number],
        ["Policy Type", policy.policy_type],
        ["Payment Status", payment.payment_status.capitalize()],
    ]
    info_table = Table(info_data, colWidths=[50 * mm, 100 * mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 10 * mm))

    amount_data = [["Description", "Amount (INR)"], ["Premium Payment", f"{float(payment.amount):,.2f}"]]
    amount_table = Table(amount_data, colWidths=[100 * mm, 50 * mm])
    amount_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(amount_table)
    story.append(Spacer(1, 15 * mm))

    story.append(Paragraph(
        "This is a system-generated receipt and does not require a signature.",
        label_style,
    ))

    doc.build(story)
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"receipt_{policy.policy_number}_{payment.id}.pdf",
    )
