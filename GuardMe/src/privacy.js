import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

document.addEventListener("DOMContentLoaded", () => {
    // ---------- GLOBALS ----------
    const canvas = document.getElementById('privacyCanvas');
    if (!canvas) return; // avoid error on load if not found
    const ctx = canvas.getContext('2d');
    
    let originalImageData = null;
    let currentBeta = 0;
    let gyroEnabled = false;
    let flatCalibrationOffset = 45;
    const MAX_ANGLE = 45;
    
    let faceTrackingEnabled = false;
    let currentFaceCount = -1;
    
    const webcam = document.getElementById("webcam");
    const faceBtn = document.getElementById("faceBtn");
    let isVideoPlaying = false;
    let detector = null;

    // Optional initialized placeholder display
    // First paint
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6b8cff';
    ctx.font = '16px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("📸 Load image & enable gyro", canvas.width/2, canvas.height/2);

    function updateDisplay() {
        if (!originalImageData) {
            ctx.fillStyle = '#0a0f1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8aaec0';
            ctx.font = '16px "Inter", sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("⬆ Load an image first", canvas.width/2, canvas.height/2);
            return;
        }
        
        // Restore original image
        ctx.putImageData(originalImageData, 0, 0);

        if (!gyroEnabled && !faceTrackingEnabled) {
            const statusDiv = document.getElementById('statusBox');
            statusDiv.className = 'status locked';
            statusDiv.innerHTML = '⚠️ Protection not enabled';
            return;
        }

        let effectiveAngle = currentBeta - flatCalibrationOffset;
        let absAngle = Math.abs(effectiveAngle);
        
        // Progress to blackout
        let intensity = 0;
        if (absAngle > 5) {
            intensity = Math.min((absAngle - 5) / MAX_ANGLE, 1.0);
        }
        
        let customStatusMsg = null;
        let statusType = 'unlocked'; // 'unlocked', 'locked', 'warning'
        
        // --- FACE TRACKING LOGIC ---
        if (faceTrackingEnabled) {
            if (currentFaceCount === 0) {
                intensity = 1.0;
                customStatusMsg = '🤷 NO FACE DETECTED (LOCKED)';
                statusType = 'warning';
            } else if (currentFaceCount > 1) {
                intensity = 1.0;
                customStatusMsg = '🚨 SNOOPER DETECTED (2+ FACES) 🚨';
                statusType = 'locked';
            }
        }

        const statusDiv = document.getElementById('statusBox');
        
        // UI Updates
        if (customStatusMsg) {
            if (statusType === 'locked') {
                statusDiv.className = 'status locked';
            } else {
                statusDiv.className = 'status locked';
                statusDiv.style.background = 'var(--warn-bg)';
                statusDiv.style.borderColor = 'var(--warn-border)';
            }
            statusDiv.innerHTML = customStatusMsg;
        } else if (intensity < 0.1) {
            statusDiv.className = 'status unlocked';
            statusDiv.innerHTML = '🔓 DISPLAY CLEAR – NORMAL VIEW';
            statusDiv.style.background = '';
            statusDiv.style.borderColor = '';
        } else if (intensity < 0.8) {
            statusDiv.className = 'status locked';
            statusDiv.style.background = 'var(--warn-bg)';
            statusDiv.style.borderColor = 'var(--warn-border)';
            statusDiv.innerHTML = '🛡️ PRIVACY FILTER ACTIVE';
        } else {
            statusDiv.className = 'status locked';
            statusDiv.innerHTML = '🔒 SCREEN OBSCURED – SAFE';
            statusDiv.style.background = '';
            statusDiv.style.borderColor = '';
        }

        // Apply visual obfuscation
        if (intensity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.96})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let louverSpacing = 3; 
            let louverThickness = 1 + (intensity * 2);
            
            ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
            for (let x = 0; x < canvas.width; x += louverSpacing) {
                ctx.fillRect(x, 0, louverThickness, canvas.height);
            }
            
            ctx.fillStyle = `rgba(20, 25, 40, ${intensity * 0.4})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function handleImageUpload(file) {
        if (!file) return;
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.onload = () => {
                let maxDim = 700;
                let width = img.width;
                let height = img.height;
                if (width > maxDim) {
                    height = (height * maxDim) / width;
                    width = maxDim;
                }
                if (height > maxDim) {
                    width = (width * maxDim) / height;
                    height = maxDim;
                }
                canvas.width = Math.floor(width);
                canvas.height = Math.floor(height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                updateDisplay();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('loadBtn').addEventListener('click', () => {
        let fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => handleImageUpload(e.target.files[0]);
        fileInput.click();
    });

    // Gyro
    function onDeviceOrientation(event) {
        if (!gyroEnabled) return;
        let beta = event.beta;
        if (beta === null || beta === undefined) return;
        currentBeta = beta;
        document.getElementById('angleDisplay').innerHTML = currentBeta.toFixed(1) + "°";
        updateDisplay();
    }

    document.getElementById('gyroEnableBtn').addEventListener('click', () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(perm => {
                    if (perm === 'granted') {
                        window.addEventListener('deviceorientation', onDeviceOrientation);
                        gyroEnabled = true;
                        document.getElementById('gyroEnableBtn').innerText = '✅ Gyro Active';
                        document.getElementById('gyroEnableBtn').disabled = true;
                        updateDisplay();
                    } else {
                        alert("Permission denied. Privacy mode won't work.");
                    }
                })
                .catch(err => alert("Error: " + err));
        } else {
            window.addEventListener('deviceorientation', onDeviceOrientation);
            gyroEnabled = true;
            document.getElementById('gyroEnableBtn').innerText = '✅ Gyro Active';
            document.getElementById('gyroEnableBtn').disabled = true;
            updateDisplay();
        }
    });

    document.getElementById('calibrateBtn').addEventListener('click', () => {
        if (!gyroEnabled) {
            alert("Please enable gyroscope first.");
            return;
        }
        flatCalibrationOffset = currentBeta;
        updateDisplay();
        let angleDiv = document.getElementById('angleDisplay');
        angleDiv.innerHTML = "⚙️ Calibrated!";
        setTimeout(() => {
            if (gyroEnabled) angleDiv.innerHTML = currentBeta.toFixed(1) + "°";
        }, 800);
    });

    // Face Tracking
    async function initializeFaceDetector() {
        faceBtn.innerText = "⏳ Loading AI...";
        faceBtn.disabled = true;

        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
            );
            detector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
                },
                runningMode: "VIDEO",
                minDetectionConfidence: 0.5
            });

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
            webcam.srcObject = stream;
            webcam.addEventListener("loadeddata", () => {
                isVideoPlaying = true;
                faceTrackingEnabled = true;
                faceBtn.innerText = "✅ Tracking Active";
                requestAnimationFrame(detectFaces);
            });
        } catch(err) {
            alert("Camera error: " + err);
            faceBtn.innerText = "❌ Tracking Blocked";
            faceBtn.disabled = false;
            faceBtn.className = "btn dark";
        }
    }

    let lastVideoTime = -1;
    function detectFaces() {
        if (!isVideoPlaying || !detector) return;
        
        let startTimeMs = performance.now();
        if (webcam.currentTime !== lastVideoTime) {
            lastVideoTime = webcam.currentTime;
            const detections = detector.detectForVideo(webcam, startTimeMs);
            const newFaceCount = detections.detections.length;
            
            if (currentFaceCount !== newFaceCount) {
                currentFaceCount = newFaceCount;
                document.getElementById("faceCountDisplay").innerText = newFaceCount;
                updateDisplay();
            }
        }
        requestAnimationFrame(detectFaces);
    }

    faceBtn.addEventListener("click", initializeFaceDetector);
});
