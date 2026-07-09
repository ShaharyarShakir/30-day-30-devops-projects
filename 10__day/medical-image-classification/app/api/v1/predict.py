import base64
from io import BytesIO
import os
import tempfile
from datetime import datetime
import cv2
import numpy as np

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from PIL import Image

from app.schemas.prediction import PredictionResponse, ReportRequest
from app.services.predictor import predict, preprocess, model
from app.explainability.gradcam import make_gradcam_heatmap, overlay_heatmap

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_image(file: UploadFile = File(...)):
    """
    Upload a chest X-ray image and return binary classification prediction (NORMAL vs PNEUMONIA), confidence, and Grad-CAM heatmap.
    """
    try:
        content = await file.read()
        image = Image.open(BytesIO(content))
        # Verify image formatting
        image.draft(None, None)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file."
        )

    # Preprocess and execute model prediction
    image_tensor = preprocess(image)
    prediction, confidence = predict(image)

    # Compute Grad-CAM heatmap
    try:
        heatmap = make_gradcam_heatmap(image_tensor, model, "conv5_block16_concat")
        img_rgb = image.convert("RGB").resize((224, 224))
        img_np = np.array(img_rgb)
        overlay = overlay_heatmap(heatmap, img_np, alpha=0.45)

        # Encode overlay to base64
        _, buffer = cv2.imencode(".jpg", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        base64_str = base64.b64encode(buffer).decode("utf-8")
        heatmap_base64 = f"data:image/jpeg;base64,{base64_str}"
    except Exception as e:
        import traceback
        traceback.print_exc()
        heatmap_base64 = None

    return {
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "heatmap": heatmap_base64,
    }


@router.get("/model-info")
async def get_model_info():
    """
    Return training and model architecture metadata.
    """
    return {
        "name": "DenseNet121",
        "framework": "TensorFlow",
        "version": "1.0",
        "epochs": 10,
        "learning_rate": 0.0001,
        "accuracy": 98.7
    }


def build_pdf_report(buffer, prediction, confidence, orig_img_path, heatmap_img_path):
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        alignment=1,
        spaceAfter=30
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#334155')
    )
    
    # Title
    story.append(Paragraph("MEDVISION AI", title_style))
    story.append(Paragraph("MEDICAL IMAGE ANALYSIS REPORT", subtitle_style))
    
    # Metadata Table
    meta_data = [
        [Paragraph("<b>Diagnostic Attribute</b>", body_style), Paragraph("<b>Value / Outcome</b>", body_style)],
        [Paragraph("Analysis Timestamp", body_style), Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)],
        [Paragraph("Prediction Classification", body_style), Paragraph(f"<font color='{'green' if prediction == 'NORMAL' else 'red'}'><b>{prediction}</b></font>", body_style)],
        [Paragraph("Model Confidence Level", body_style), Paragraph(f"<b>{confidence * 100:.2f}%</b>", body_style)],
        [Paragraph("Neural Network Base", body_style), Paragraph("DenseNet121 Transfer Learning", body_style)]
    ]
    t = Table(meta_data, colWidths=[200, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#f1f5f9')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Images
    story.append(Paragraph("Visual Interpretability Diagnostics (Grad-CAM)", section_title))
    img_data = [
        [RLImage(orig_img_path, width=220, height=220), RLImage(heatmap_img_path, width=220, height=220)],
        [Paragraph("Original Chest X-ray Specimen", body_style), Paragraph("Grad-CAM Heatmap Localization", body_style)]
    ]
    img_table = Table(img_data, colWidths=[250, 250])
    img_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(img_table)
    story.append(Spacer(1, 20))
    
    # Physician Notice
    story.append(Paragraph("<b>Physician Advisory Notice:</b>", section_title))
    notice_text = (
        "This report was automatically generated by the MedVision AI diagnostic screening platform. "
        "The model is a deep convolutional network (DenseNet121) optimized for pneumonia feature-map classifications. "
        "Computer-aided diagnostic (CAD) recommendations must be reviewed and validated by a board-certified "
        "radiologist prior to initiating patient clinical treatment pathways."
    )
    story.append(Paragraph(notice_text, body_style))
    
    doc.build(story)


@router.post("/report")
async def generate_report(req: ReportRequest):
    """
    Generate a PDF medical AI report containing patient chest X-ray and model confidence overlay heatmap.
    """
    try:
        # Decode base64 images
        orig_bytes = base64.b64decode(req.image.split(",")[-1])
        heatmap_bytes = base64.b64decode(req.heatmap.split(",")[-1])
        
        # Save temporarily to feed to reportlab
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f_orig:
            f_orig.write(orig_bytes)
            orig_path = f_orig.name
            
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f_heatmap:
            f_heatmap.write(heatmap_bytes)
            heatmap_path = f_heatmap.name
            
        pdf_buffer = BytesIO()
        build_pdf_report(pdf_buffer, req.prediction, req.confidence, orig_path, heatmap_path)
        pdf_buffer.seek(0)
        
        try:
            os.unlink(orig_path)
            os.unlink(heatmap_path)
        except Exception:
            pass
            
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=medvision_report.pdf"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
