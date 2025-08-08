document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Document ready: loaded script.js");

  // ----------------------------------------
  // 📌 scan_pills logic
  const video = document.getElementById("video");
  const captureBtn = document.getElementById("captureBtn");
  const switchCameraBtn = document.getElementById("switchCameraBtn");
  const resultImg = document.getElementById("result-img");
  const textOutput = document.getElementById("textOutput");
  const cameraError = document.getElementById("cameraError");
  const uploadImage = document.getElementById("uploadImage");
  const uploadSubmitBtn = document.getElementById("uploadSubmitBtn");

  let currentStream = null;
  let usingFrontCamera = true;

  async function startCamera() {
    console.log("📷 Starting pill camera. Front:", usingFrontCamera);

    try {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { exact: usingFrontCamera ? "user" : "environment" }
        },
        audio: false
      };

      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = currentStream;
      cameraError.style.display = 'none';

    } catch (err) {
      console.error("Camera error:", err);
      cameraError.textContent = "Camera error: " + err.message;
      cameraError.style.display = 'block';
    }
  }

  if (video) {
    startCamera();
  }

  switchCameraBtn?.addEventListener("click", () => {
    usingFrontCamera = !usingFrontCamera;
    startCamera();
  });

  captureBtn?.addEventListener("click", () => {
    if (!currentStream) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/png");

    fetch(imageData)
      .then(res => res.blob())
      .then(blob => {
        const formData = new FormData();
        formData.append("image", blob, "capture.png");
        sendImageToBackend(formData);
      });
  });

  uploadSubmitBtn?.addEventListener("click", () => {
    const file = uploadImage.files[0];
    if (!file) {
      textOutput.value = "❌ No uploaded image to submit.";
      textOutput.style.display = 'block';
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    sendImageToBackend(formData);
  });

  function sendImageToBackend(formData) {
    fetch("/predict_scan_pills", {
      method: "POST",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const matched = (data.matched || []).filter(Boolean);
        const unmatched = (data.unmatched || []).filter(Boolean);

        textOutput.value = `✅ Matched: ${matched.length > 0 ? matched.join(", ") : "None"}\n❌ Unmatched: ${unmatched.length > 0 ? unmatched.join(", ") : "None"}`;

        resultImg.src = data.image;
        resultImg.style.display = 'block';
        textOutput.style.display = 'block';
      } else {
        textOutput.value = "❌ " + data.error;
        resultImg.style.display = 'none';
        textOutput.style.display = 'block';
      }
    })
    .catch(error => {
      textOutput.value = "❌ Error: " + error.message;
      resultImg.style.display = 'none';
      textOutput.style.display = 'block';
    });
  }

  resultImg?.addEventListener("click", () => {
    if (resultImg.src) {
      document.getElementById("zoomedImage").src = resultImg.src;
      document.getElementById("imageModal").style.display = "block";
    }
  });

  const imageModal = document.getElementById("imageModal");
  const closeModalBtn = document.getElementById("closeModalBtn");

  function closeImageModal() {
    imageModal.style.display = "none";
  }

  if (imageModal && closeModalBtn) {
    closeModalBtn.addEventListener("click", closeImageModal);
    imageModal.addEventListener("click", (e) => {
      if (e.target === imageModal) {
        closeImageModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeImageModal();
      }
    });
  }

  // ----------------------------------------
  // 📌 scan_prescription logic
  const prescriptionVideo = document.getElementById("prescriptionVideo");
  const prescriptionCaptureBtn = document.getElementById("prescriptionCaptureBtn");
  const prescriptionSwitchCameraBtn = document.getElementById("prescriptionSwitchCameraBtn");
  const prescriptionResultImg = document.getElementById("prescriptionResultImg");
  const prescriptionTextOutput = document.getElementById("prescriptionTextOutput");
  const prescriptionLLMOutput = document.getElementById("prescriptionLLMOutput");
  const prescriptionCameraError = document.getElementById("prescriptionCameraError");
  const prescriptionUploadImage = document.getElementById("prescriptionUploadImage");
  const prescriptionUploadSubmitBtn = document.getElementById("prescriptionUploadSubmitBtn");

  let prescriptionStream = null;
  let usingFrontCameraPrescription = true;

  async function startPrescriptionCamera() {
    console.log("📷 Starting prescription camera. Front:", usingFrontCameraPrescription);

    try {
      if (prescriptionStream) {
        prescriptionStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { exact: usingFrontCameraPrescription ? "user" : "environment" }
        },
        audio: false
      };

      prescriptionStream = await navigator.mediaDevices.getUserMedia(constraints);
      prescriptionVideo.srcObject = prescriptionStream;
      prescriptionCameraError.style.display = 'none';

    } catch (err) {
      console.error("Prescription camera error:", err);
      prescriptionCameraError.textContent = "Camera error: " + err.message;
      prescriptionCameraError.style.display = 'block';
    }
  }

  if (prescriptionVideo) {
    startPrescriptionCamera();
  }

  prescriptionSwitchCameraBtn?.addEventListener("click", () => {
    usingFrontCameraPrescription = !usingFrontCameraPrescription;
    startPrescriptionCamera();
  });

  prescriptionCaptureBtn?.addEventListener("click", () => {
    if (!prescriptionStream) return;

    let countdown = 2;
    prescriptionCaptureBtn.disabled = true;
    const originalText = prescriptionCaptureBtn.textContent;

    prescriptionCaptureBtn.textContent = `Capturing in ${countdown--}...`;

    const interval = setInterval(() => {
      if (countdown < 0) {
        clearInterval(interval);
        prescriptionCaptureBtn.textContent = originalText;
        prescriptionCaptureBtn.disabled = false;
        capturePrescriptionImage();
      } else {
        prescriptionCaptureBtn.textContent = `Capturing in ${countdown--}...`;
      }
    }, 1000);
  });

  function capturePrescriptionImage() {
    const videoBounds = prescriptionVideo.getBoundingClientRect();
    const overlay = document.querySelector(".overlay-frame");
    const overlayBounds = overlay.getBoundingClientRect();

    const xRatio = prescriptionVideo.videoWidth / videoBounds.width;
    const yRatio = prescriptionVideo.videoHeight / videoBounds.height;

    const padX = overlayBounds.width * 0.1;
    const padY = overlayBounds.height * 0.1;

    const cropX = Math.max(0, (overlayBounds.left - videoBounds.left) * xRatio - padX);
    const cropY = Math.max(0, (overlayBounds.top - videoBounds.top) * yRatio - padY);
    const cropWidth = overlayBounds.width * xRatio + padX * 2;
    const cropHeight = overlayBounds.height * yRatio + padY * 2;

    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      prescriptionVideo,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = 1024;
    resizedCanvas.height = 1024;
    resizedCanvas.getContext("2d").drawImage(canvas, 0, 0, 1024, 1024);

    resizedCanvas.toBlob(blob => {
      const formData = new FormData();
      formData.append("image", blob, "capture.png");
      sendPrescriptionImage(formData);
    }, "image/png");
  }

  prescriptionUploadSubmitBtn?.addEventListener("click", () => {
    const file = prescriptionUploadImage.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    sendPrescriptionImage(formData);
  });

  function sendPrescriptionImage(formData) {
    fetch("/predict_prescription", {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        prescriptionTextOutput.value = data.text;
        prescriptionTextOutput.style.display = 'block';

        if (data.structured && Array.isArray(data.structured) && data.structured.length > 0) {
          const formatted = data.structured.map(item =>
            `Medicine: ${item.medicine}\nDose: ${item.dosage}\nQuantity: ${item.quantity}\nInstruction: ${item.Instruction}\nRefill: ${item.Refill}`
          ).join("\n\n");

          prescriptionLLMOutput.value = formatted;
          prescriptionLLMOutput.style.display = 'block';

        } else if (data.llm_raw) {
          prescriptionLLMOutput.value = data.llm_raw;
          prescriptionLLMOutput.style.display = 'block';
        }

        if (data.image_url) {
          prescriptionResultImg.src = data.image_url;
          prescriptionResultImg.style.display = 'block';
        }

      } else {
        prescriptionTextOutput.value = "❌ " + data.error;
        prescriptionTextOutput.style.display = 'block';
        prescriptionLLMOutput.style.display = 'none';
        prescriptionResultImg.style.display = 'none';
      }
    })
    .catch(err => {
      prescriptionTextOutput.value = "❌ Error: " + err.message;
      prescriptionTextOutput.style.display = 'block';
      prescriptionLLMOutput.style.display = 'none';
      prescriptionResultImg.style.display = 'none';
    });
  }

  prescriptionResultImg?.addEventListener("click", () => {
    document.getElementById("prescriptionZoomedImage").src = prescriptionResultImg.src;
    document.getElementById("prescriptionImageModal").style.display = "block";
  });
});
