from flask import Blueprint, render_template, request, jsonify
from ultralytics import YOLO
import numpy as np
import cv2
from PIL import Image
import base64
import os

# === Load YOLO models ===
model_path_5class = os.path.join(os.path.dirname(__file__), "..", "model", "pre_train5class.pt")
model_path_all = os.path.join(os.path.dirname(__file__), "..", "model", "all_pills.pt")

model = YOLO(model_path_5class)
model1 = YOLO(model_path_all)

label_bp = Blueprint("label", __name__)

@label_bp.route("/scan_pills")
def scan_pills():
    return render_template("scan_pills.html")

def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    return interArea / float(boxAArea + boxBArea - interArea + 1e-6)

@label_bp.route("/predict_scan_pills", methods=["POST"])
def predict_scan_pills():
    try:
        file = request.files.get("image")
        if not file or file.filename == "":
            return jsonify({"success": False, "error": "No image uploaded"}), 400

        # Save image as .jpg to /tmp (to make camera capture = upload)
        image = Image.open(file.stream).convert("RGB")
        tmp_path = "/tmp/pill_capture.jpg"
        image.save(tmp_path, format="JPEG")
        image_np = np.array(image)

        try:
            with open("/tmp/medicine_list.txt", "r") as f:
                expected_list_raw = f.read().splitlines()
        except Exception as e:
            print("\u26a0\ufe0f Could not load expected medicines list:", e)
            expected_list_raw = []

        expected_list = [item.strip().lower() for item in expected_list_raw]

        results_all = model1.predict(tmp_path, conf=0.1, imgsz=640)[0]
        pill_boxes_all = [box.xyxy[0].tolist() for box in results_all.boxes]

        results_known = model.predict(tmp_path, conf=0.5, imgsz=640)[0]
        known_labels = [
            (model.names[int(box.cls)], float(box.conf), box.xyxy[0].tolist())
            for box in results_known.boxes
        ]

        matched_list = []
        unmatched_list = []
        annotated_img = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        matched_regions = []

        for known_label, conf, known_box in known_labels:
            label_lower = known_label.strip().lower()
            x1, y1, x2, y2 = map(int, known_box)

            if label_lower in expected_list:
                matched_list.append(known_label)
                display_text = f"{known_label} Matched"
                color = (0, 255, 0)
            else:
                unmatched_list.append(known_label)
                display_text = known_label
                color = (0, 0, 255)

            matched_regions.append(known_box)
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)
            cv2.putText(
                annotated_img,
                display_text,
                (x1, max(y1 - 12, 0)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                color,
                3,
                cv2.LINE_AA
            )

        for pill_box in pill_boxes_all:
            is_matched = any(compute_iou(pill_box, region) > 0.5 for region in matched_regions)
            if not is_matched:
                x1, y1, x2, y2 = map(int, pill_box)
                unmatched_list.append("unknown")
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 0, 255), 3)
                cv2.putText(
                    annotated_img,
                    "unknown",
                    (x1, max(y1 - 12, 0)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (0, 0, 255),
                    3,
                    cv2.LINE_AA
                )

        _, buffer = cv2.imencode(".jpg", annotated_img)
        encoded_image = base64.b64encode(buffer).decode("utf-8")

        return jsonify({
            "success": True,
            "matched": matched_list,
            "unmatched": unmatched_list,
            "image": f"data:image/jpeg;base64,{encoded_image}"
        })

    except Exception as e:
        print("\ud83d\udd25 ERROR:", e)
        return jsonify({"success": False, "error": str(e)}), 500

def preprocess_crop(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blur = cv2.medianBlur(gray, 3)
    binary = cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        3
    )
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)