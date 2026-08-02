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


def _certificate_border(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#2D6A4F"))
    canvas.setLineWidth(1.2)
    margin = 10 * mm
    canvas.rect(
        margin, margin,
        A4[0] - 2 * margin, A4[1] - 2 * margin,
    )
    canvas.restoreState()


@receipt_bp.route("/policy/<int:policy_id>", methods=["GET"])
@jwt_required()
def policy_certificate(policy_id):
    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    customer = Customer.query.get(policy.customer_id)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=25 * mm, bottomMargin=25 * mm,
        leftMargin=22 * mm, rightMargin=22 * mm,
    )
    styles = getSampleStyleSheet()
    eyebrow_style = ParagraphStyle(
        "Eyebrow", parent=styles["Normal"], textColor=colors.HexColor("#2D6A4F"),
        fontSize=10, spaceAfter=2, fontName="Helvetica-Bold",
    )
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"], fontSize=22,
        textColor=colors.HexColor("#1B4332"),
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"], textColor=colors.HexColor("#40916C"),
        fontSize=13, fontName="Helvetica-Bold",
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"], textColor=colors.HexColor("#64748b"),
        fontSize=9,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"], textColor=colors.HexColor("#1F2937"),
        fontSize=11, leading=16,
    )

    story = []
    story.append(Paragraph("INSURANCE MANAGEMENT PLATFORM", eyebrow_style))
    story.append(Paragraph("POLICY CERTIFICATE", title_style))
    story.append(Paragraph(policy.policy_type, subtitle_style))
    story.append(Spacer(1, 10 * mm))

    holder_name = customer.name if customer else "-"
    story.append(Paragraph(
        f"This certificate confirms that <b>{holder_name}</b> is covered under the "
        f"insurance policy detailed below. The policy is valid as of the certificate "
        f"issue date and has been generated electronically by the Insurance "
        f"Management Platform.",
        body_style,
    ))
    story.append(Spacer(1, 8 * mm))

    status_color = {
        "active": colors.HexColor("#2D6A4F"),
        "expired": colors.HexColor("#E9C46A"),
        "cancelled": colors.HexColor("#BC4749"),
    }.get(policy.status, colors.HexColor("#64748b"))

    coverage_display = (
        f"INR {float(policy.coverage_amount):,.2f}"
        if policy.coverage_amount else "Not specified"
    )

    info_data = [
        ["Certificate No.", f"CERT-{date.today().year}-{policy.id:06d}"],
        ["Policy Number", policy.policy_number],
        ["Policyholder", holder_name],
        ["Customer ID", f"CUST-{policy.customer_id:04d}"],
        ["Policy Type", policy.policy_type],
        ["Coverage Amount", coverage_display],
        ["Premium Amount", f"INR {float(policy.premium_amount):,.2f}"],
        ["Coverage Start Date", policy.start_date.strftime("%d %b %Y")],
        ["Coverage End Date", policy.end_date.strftime("%d %b %Y")],
        ["Certificate Issued", date.today().strftime("%d %b %Y")],
    ]
    info_table = Table(info_data, colWidths=[55 * mm, 95 * mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))

    status_table = Table(
        [["Status", policy.status.upper()]],
        colWidths=[55 * mm, 95 * mm],
    )
    status_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, 0), colors.HexColor("#475569")),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.white),
        ("BACKGROUND", (1, 0), (1, 0), status_color),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
    ]))
    story.append(status_table)
    story.append(Spacer(1, 15 * mm))

    story.append(Paragraph(
        "✔ Digitally Verified — Insurance Management Platform",
        ParagraphStyle(
            "Seal", parent=label_style, textColor=colors.HexColor("#2D6A4F"),
            fontName="Helvetica-Bold", fontSize=9,
        ),
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "This certificate is digitally generated by the Insurance Management "
        "Platform and does not require a signature.",
        label_style,
    ))

    doc.build(story, onFirstPage=_certificate_border, onLaterPages=_certificate_border)
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"certificate_{policy.policy_number}.pdf",
    )
