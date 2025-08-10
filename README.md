# MedSmart — AI-Powered Medication Assistance System

**AIG 200 AI Capstone Project — Group 1**  
Duc Phu Nguyen · Johnson Yim · Masoud Masoori  

---

## 📖 Overview
**MedSmart** is an AI-driven system designed to help elderly individuals take their medication **safely, accurately, and on time**.  
Using **computer vision** and **natural language processing**, MedSmart can:
- Recognize pills from camera images in real-world conditions
- Extract and structure information from printed and handwritten prescriptions
- Create personalized medication schedules and reminders
- Support communication between users and caregivers

---

## 💡 Problem
Medication mismanagement is a critical issue for elderly individuals, often leading to:
- Missed doses
- Incorrect dosages
- Wrong medications
- Timing errors

Current solutions (pill organizers, alarms) are insufficient for complex regimens or users with cognitive decline.  
MedSmart addresses this gap with a **smarter, more adaptable AI-based system**.

---

## 🎯 Objectives
- **Medication Recognition**: Detect and classify tablets/capsules from images with high accuracy and robustness.
- **Prescription Recognition**: Read and understand prescription images, extracting key fields:
  - Drug name
  - Dosage
  - Frequency
  - Special instructions
- **Personalized Schedules**: Generate adherence plans and reminders.
- **Caregiver Support**: Enable monitoring and alerts for missed or incorrect doses.

---

## 🛠 Technology Stack
**AI Models**
- **YOLOv8n-seg** — Pill detection & segmentation (custom dataset)
- **YOLOv8n** — Text region detection in prescriptions
- **Microsoft TrOCR** — OCR for printed & handwritten text
- **Ollama LLM** — Local large language model for text parsing & structuring

**Data Tools**
- **Roboflow** — Dataset creation, annotation, and augmentation
- **OpenCV** — Frame extraction & preprocessing

**Backend & Deployment**
- **Flask API** for model inference
- **Docker** for containerized deployment
- **Google Cloud Run** for scalable hosting

---

## 🔍 How It Works
### **1. Medication Recognition**
- **Stage 1**: General YOLOv8n-seg detects any pill-shaped object (`unknown` class).
- **Stage 2**: Cropped pill images passed to specific YOLOv8n-seg model for classification (Centrum, Magnesium, CoenzymeQ10, Cordyceps Mushroom).
- **Safety Check**: If confidence < threshold → label as `unknown` for safety.

### **2. Prescription Data Extraction**
1. **Text Detection** — YOLOv8n locates text regions in prescription images.
2. **OCR** — TrOCR reads printed or handwritten text.
3. **Text Parsing** — Ollama LLM extracts structured JSON with drug name, dosage, frequency, and notes.

---

## 📊 Key Results
- **Pill Recognition**: >99% mAP@0.5 across all classes in controlled tests; robust in varied lighting and angles.
- **Prescription Extraction**: >90% reliability for 1–3 drug prescriptions; acceptable results for more complex cases.
- **Real-World Readiness**: Custom dataset design significantly outperformed public datasets in real use cases.

---

## 🚧 Challenges & Future Work
**Challenges**
- Poor handwriting and low-quality images reduce OCR accuracy
- Unintegrated pill-to-prescription matching in current version
- Dataset diversity still needs expansion (pill types, skin tones, environments)

**Future Work**
- Add liquid medication support
- Enhance error detection (e.g., drug interaction alerts)
- Voice command and TTS features
- EHR integration
- Full offline functionality

---

## 🌟 Significance
MedSmart demonstrates how **AI-powered computer vision + NLP** can create a practical, safe, and scalable solution for medication adherence.  
It combines **custom datasets, modern ML pipelines, and thoughtful safety measures** to address real-world healthcare challenges.

---

## 📜 References
- Ultralytics YOLOv8 — https://github.com/ultralytics/ultralytics  
- Microsoft TrOCR — https://github.com/microsoft/unilm/tree/master/trocr  
- Ollama — https://ollama.com  
- Roboflow — https://roboflow.com  

---

## 🌐 Live Demo
🔗 **Web App**: [MedSmart Live](https://scanmed-1093299311978.europe-west1.run.app/)  
**Username**: `johnson`  
**Password**: `aig200s25`  

---
