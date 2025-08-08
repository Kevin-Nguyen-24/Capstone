from flask import Blueprint, render_template, request, jsonify
from ultralytics import YOLO
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
import json
import requests
import numpy as np
from PIL import Image
import cv2
import os
import re
import pickle
import uuid

# === Blueprint ===
prescription_bp = Blueprint("prescription", __name__)

# === Load YOLO Model ===
model_path = os.path.join(os.path.dirname(__file__), "..", "model", "ocr_scan.pt")
prescription_model = YOLO(model_path)


# === Hugging Face cache (for Google Cloud Run) ===
HF_CACHE_DIR = "/tmp/huggingface"


# === Load TrOCR Model ===
processor = TrOCRProcessor.from_pretrained(
    "microsoft/trocr-base-printed",
    cache_dir=HF_CACHE_DIR
)

trocr_model = VisionEncoderDecoderModel.from_pretrained(
    "microsoft/trocr-base-printed",
    cache_dir=HF_CACHE_DIR
).to("cuda" if torch.cuda.is_available() else "cpu")


# === Routes ===
@prescription_bp.route("/scan_prescription")
def prescription_page():
    return render_template("scan_prescription.html")



@prescription_bp.route("/predict_prescription", methods=["POST"])
def predict_prescription():
    try:
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "No image uploaded"}), 400

        # Convert uploaded image to numpy array
        image = Image.open(file.stream).convert("RGB")

        # ✅ Save captured/uploaded prescription image as JPEG
        tmp_path = "/tmp/prescription_capture.jpg"
        image.save(tmp_path, format="JPEG")

        image_np = np.array(image)


        # Run detection and OCR
        ocr_texts = extract_text_from_image_np(image_np)
        if not ocr_texts:
            return jsonify({
                "success": False,
                "text": "",
                "llm_raw": "",
                "structured": [],
                "error": "No text detected from image."
            })


        def clean_ocr_text(text):
            corrections = {
                "smL": "mL",
                "m9": "mg",
                "1O0mg": "100mg",
                "1O0": "100",
                "Omg": "0mg",
                "jab": "tab",          # OCR typo fix
                "table": "tablet",     # ambiguous word fix
                "1/": "1"              # fraction cleanup
            }

            for wrong, right in corrections.items():
                text = text.replace(wrong, right)

            # Remove weird symbols but keep important ones
            text = re.sub(r"[^a-zA-Z0-9\s./%-]", " ", text)
            text = re.sub(r"(\d+)([a-zA-Z]+)", r"\1 \2", text)  # 50mg2tabs → 50mg 2tabs
            text = re.sub(r"\s+", " ", text)

            return text.strip()


        # Clean and combine OCR texts
        # ocr_texts = [clean_ocr_text(text) for text in ocr_texts]    

        raw_text = " ".join(ocr_texts)
        combined_text = clean_ocr_text(raw_text)
        print("🧹 Cleaned OCR Text:", combined_text)

        # Prepare prompt for LLM
        prompt = f"""
        You are a pharmacy assistant. Extract all medicines based only on the information provided in the text below.

        Return the result as a **JSON array**, where each entry has the following keys:
        [
        {{
            "medicine": "...",
            "dosage": "...",
            "quantity": "...",
            "Instruction": "...",
            "Refill": "..."
        }}
        ]

        - Do NOT explain.
        - Use "N/A" if any field is missing or not mentioned.
     

        Text:
        \"\"\"{combined_text}\"\"\"
        """
       

        
        
        # Call Ollama
        response_text = ask_ollama(prompt)
        print("📨 LLM Raw Response:", response_text)

        structured = []
        try:
            match = re.search(r'\[\s*{.*?}\s*\]', response_text, re.DOTALL)
            if match:
                structured = json.loads(match.group())
            else:
                print("No valid JSON array found in LLM response.")
        except Exception as e:
            print("JSON parsing error:", e)

        expected_list_raw = [item.get("medicine", "") for item in structured if item.get("medicine")]

        # Save list of medicine names for pill scan phase
        if expected_list_raw:
            txt_path = "/tmp/medicine_list.txt"
            with open(txt_path, "w") as f:
                for name in expected_list_raw:
                    f.write(name + "\n")

        # Save the full structured output to JSON
        json_path = "/tmp/structured_output.json"
        with open(json_path, "w") as json_file:
            json.dump(structured, json_file, indent=2)
        

        return jsonify({
            "success": True,
            "text": combined_text,
            "llm_raw": response_text,
            "structured": structured
            
        })

    except Exception as e:
        print("Internal server error:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

  


# Add the new route here
@prescription_bp.route("/view_structured_output")
def view_structured_output():
    json_path = "/tmp/structured_output.json"
    
    if not os.path.exists(json_path):
        return render_template("view_structured_output.html", data=None)

    try:
        with open(json_path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print("Failed to load structured_output.json:", str(e))
        data = None

    return render_template("view_structured_output.html", data=data)

# === Helper Functions ===
def preprocess_image(crop):
    # 1. Convert to grayscale
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # 2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)

    # 3. Sharpen the image (to boost edge clarity)
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    sharpened = cv2.filter2D(equalized, -1, kernel)

    # 4. Median blur (light noise reduction)
    blurred = cv2.medianBlur(sharpened, 3)

    # 5. Adaptive thresholding (binarization)
    adaptive = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 3
    )

    # 6. Resize to 512x512 (better for TrOCR input)
    resized = cv2.resize(adaptive, (512, 512), interpolation=cv2.INTER_AREA)

    # 7. Convert back to 3-channel RGB for TrOCR
    return cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)




def extract_text_from_image_np(image_np):
    print("Running YOLO detection on prescription image...")
    results = prescription_model(image_np)[0]

    # Sort by top-down, left-right
    sorted_boxes = sorted(results.boxes, key=lambda b: (b.xyxy[0][1].item(), b.xyxy[0][0].item()))

    texts = []
    for box in sorted_boxes:
        if box.conf[0] < 0.3:  # Increased confidence threshold for better results from photos
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0])
        crop = preprocess_image(image_np[y1:y2, x1:x2])
        pil_img = Image.fromarray(crop)

        pixel_values = processor(images=pil_img, return_tensors="pt").pixel_values.to(trocr_model.device)
        generated_ids = trocr_model.generate(pixel_values)
        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

        if text:
            print(f"Detected text: {text}")
            texts.append(text)

    return texts



def ask_ollama(prompt, model="gemma3:4b"):
    try:
        print("🧠 Sending prompt to Ollama...")
        response = requests.post(
            "https://ollama-gemma-388033576344.europe-west1.run.app/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        if response.status_code != 200:
            print(f"⚠️ Ollama API error {response.status_code}: {response.text}")
            return f"⚠️ Ollama API error {response.status_code}: {response.text}"

        try:
            data = response.json()
        except Exception as json_err:
            print("❌ Failed to parse Ollama response JSON:", response.text)
            return f"⚠️ Failed to parse Ollama JSON: {json_err}"

        print("📨 Ollama response JSON:", json.dumps(data, indent=2))

        return data.get("response", "⚠️ 'response' key not found in Ollama result.")

    except Exception as e:
        print("🚨 Exception while contacting Ollama:", str(e))
        return f"⚠️ Error contacting Ollama: {e}"
