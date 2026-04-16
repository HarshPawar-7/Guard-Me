document.addEventListener('DOMContentLoaded', () => {
    // --- Helper functions ---
    function stringToBits(str) {
        let bits = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            bits += code.toString(2).padStart(8, '0');
        }
        return bits;
    }

    function bitsToString(bits) {
        let result = '';
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.substr(i, 8);
            if (byte.length < 8) break;
            const code = parseInt(byte, 2);
            if (code === 0) break; // null terminator
            result += String.fromCharCode(code);
        }
        return result;
    }

    function xorEncryptDecrypt(text, password) {
        if (!password) return text;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }

    function formatExtractedData(raw) {
        try {
            const parsed = JSON.parse(raw);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return raw;
        }
    }

    function embedMessage(imageData, message, password) {
        let finalMessage;
        if (password) {
            const toEncrypt = message + "::VALID";
            const encrypted = xorEncryptDecrypt(toEncrypt, password);
            finalMessage = "STEGO:" + encrypted;
        } else {
            finalMessage = "STEGO:" + message;
        }
        
        const bits = stringToBits(finalMessage) + '00000000';
        const pixels = imageData.data;
        if (bits.length > pixels.length) {
            throw new Error('Message too long for this image');
        }
        for (let i = 0; i < bits.length; i++) {
            const pixelIndex = i;
            const bit = parseInt(bits[i], 10);
            if (pixelIndex >= pixels.length) break;
            pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | bit;
        }
        return imageData;
    }

    function extractMessage(imageData, password = null) {
        const pixels = imageData.data;
        let bits = '';
        for (let i = 0; i < pixels.length; i++) {
            bits += (pixels[i] & 1).toString();
            if (bits.length >= 8 && bits.substr(-8) === '00000000') {
                break;
            }
        }
        let extracted = bitsToString(bits);
        
        if (!extracted.startsWith("STEGO:")) {
            return { success: true, data: extracted, raw: extracted };
        }
        
        const withoutMarker = extracted.slice(6);
        
        if (password) {
            const decrypted = xorEncryptDecrypt(withoutMarker, password);
            if (decrypted.endsWith("::VALID")) {
                const original = decrypted.slice(0, -7);
                return { success: true, data: original, raw: extracted };
            } else {
                return { success: false, data: null, raw: extracted, error: "Password incorrect or message not encrypted with this password." };
            }
        } else {
            return { success: true, data: withoutMarker, raw: extracted };
        }
    }

    // --- DOM bindings ---
    const hideImageInput = document.getElementById('hideImage');
    const patientDataText = document.getElementById('patientData');
    const hidePassword = document.getElementById('hidePassword');
    const hideBtn = document.getElementById('hideBtn');
    const hideStatus = document.getElementById('hideStatus');

    const extractImageInput = document.getElementById('extractImage');
    const extractPassword = document.getElementById('extractPassword');
    const extractBtn = document.getElementById('extractBtn');
    const extractResultDiv = document.getElementById('extractResult');
    const extractedTextPre = document.getElementById('extractedText');
    const copyBtn = document.getElementById('copyBtn');
    const extractStatus = document.getElementById('extractStatus');

    const tabBtns = document.querySelectorAll('.stego-tabs .tab-btn');
    const modes = {
        hide: document.getElementById('hideMode'),
        extract: document.getElementById('extractMode')
    };

    if (!hideBtn) return; // avoid errors if script executes on wrong page

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Object.keys(modes).forEach(m => modes[m].classList.remove('active'));
            modes[mode].classList.add('active');
        });
    });

    hideBtn.addEventListener('click', async () => {
        const file = hideImageInput.files[0];
        if (!file) {
            showStatus(hideStatus, 'Please select an image', 'error');
            return;
        }
        let message = patientDataText.value.trim();
        if (!message) {
            showStatus(hideStatus, 'Please enter patient data', 'error');
            return;
        }
        const password = hidePassword.value;
        
        try {
            const img = await loadImage(file);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imageData = embedMessage(imageData, message, password);
            ctx.putImageData(imageData, 0, 0);
            
            const link = document.createElement('a');
            link.download = 'stego_medical.png';
            link.href = canvas.toDataURL();
            link.click();
            
            showStatus(hideStatus, 'Image saved! Patient data hidden.', 'success');
        } catch (err) {
            showStatus(hideStatus, err.message, 'error');
        }
    });

    extractBtn.addEventListener('click', async () => {
        const file = extractImageInput.files[0];
        if (!file) {
            showStatus(extractStatus, 'Please select an image', 'error');
            extractResultDiv.style.display = 'none';
            return;
        }
        const password = extractPassword.value;
        
        try {
            const img = await loadImage(file);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = extractMessage(imageData, password || null);
            
            if (result.success) {
                const formatted = formatExtractedData(result.data);
                extractedTextPre.textContent = formatted;
                extractResultDiv.style.display = 'block';
                showStatus(extractStatus, 'Data extracted successfully', 'success');
            } else {
                extractResultDiv.style.display = 'none';
                showStatus(extractStatus, result.error, 'error');
            }
        } catch (err) {
            showStatus(extractStatus, err.message, 'error');
            extractResultDiv.style.display = 'none';
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = extractedTextPre.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(() => {
            alert('Could not copy text');
        });
    });

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status-msg ${type}`;
        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = '';
                element.className = 'status-msg';
            }
        }, 3000);
    }
});
