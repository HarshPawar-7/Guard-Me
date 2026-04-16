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

// XOR encryption/decryption (same function)
function xorEncryptDecrypt(text, password) {
    if (!password) return text;
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
        result += String.fromCharCode(charCode);
    }
    return result;
}

// Try to pretty-print JSON
function formatExtractedData(raw) {
    try {
        const parsed = JSON.parse(raw);
        return JSON.stringify(parsed, null, 2);
    } catch (e) {
        return raw;
    }
}

// Embed message with marker and optional password
function embedMessage(imageData, message, password) {
    let finalMessage;
    if (password) {
        // Encrypt the message plus a validation suffix
        const toEncrypt = message + "::VALID";
        const encrypted = xorEncryptDecrypt(toEncrypt, password);
        finalMessage = "STEGO:" + encrypted;
    } else {
        // No password: just marker + message
        finalMessage = "STEGO:" + message;
    }
    
    const bits = stringToBits(finalMessage) + '00000000';
    const pixels = imageData.data;
    if (bits.length > pixels.length) {
        throw new Error('Message too long for this image');
    }
    // Modify LSB of each pixel byte (R,G,B,A if present)
    for (let i = 0; i < bits.length; i++) {
        const pixelIndex = i;
        const bit = parseInt(bits[i], 10);
        if (pixelIndex >= pixels.length) break;
        pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | bit;
    }
    return imageData;
}

// Extract message with password verification
function extractMessage(imageData, password = null) {
    const pixels = imageData.data;
    let bits = '';
    // Read LSBs from all pixel channels
    for (let i = 0; i < pixels.length; i++) {
        bits += (pixels[i] & 1).toString();
        // Early stop if we have a null terminator
        if (bits.length >= 8 && bits.substr(-8) === '00000000') {
            break;
        }
    }
    let extracted = bitsToString(bits);
    
    // Check for the plaintext marker
    if (!extracted.startsWith("STEGO:")) {
        // No marker – treat as raw text (could be from non-stego image)
        return { success: true, data: extracted, raw: extracted };
    }
    
    // Remove the marker
    const withoutMarker = extracted.slice(6);
    
    // If password is provided, attempt decryption
    if (password) {
        const decrypted = xorEncryptDecrypt(withoutMarker, password);
        // Check for validation suffix
        if (decrypted.endsWith("::VALID")) {
            // Remove the suffix and return the original message
            const original = decrypted.slice(0, -7);
            return { success: true, data: original, raw: extracted };
        } else {
            // Wrong password – suffix not found
            return { success: false, data: null, raw: extracted, error: "Password incorrect or message not encrypted with this password." };
        }
    } else {
        // No password provided – return the data after marker
        return { success: true, data: withoutMarker, raw: extracted };
    }
}

// --- DOM elements (same as before) ---
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

// Tab switching
const tabBtns = document.querySelectorAll('.tab-btn');
const modes = {
    hide: document.getElementById('hideMode'),
    extract: document.getElementById('extractMode')
};

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.keys(modes).forEach(m => modes[m].classList.remove('active'));
        modes[mode].classList.add('active');
    });
});

// --- Hide functionality ---
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
        
        // Download as PNG
        const link = document.createElement('a');
        link.download = 'stego_medical.png';
        link.href = canvas.toDataURL();
        link.click();
        
        showStatus(hideStatus, 'Image saved! Patient data hidden.', 'success');
    } catch (err) {
        showStatus(hideStatus, err.message, 'error');
    }
});

// --- Extract functionality ---
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
            // Wrong password case
            extractResultDiv.style.display = 'none';
            showStatus(extractStatus, result.error, 'error');
        }
    } catch (err) {
        showStatus(extractStatus, err.message, 'error');
        extractResultDiv.style.display = 'none';
    }
});

// Copy button functionality
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

// Helper functions
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
    element.className = `status ${type}`;
    setTimeout(() => {
        if (element.textContent === message) {
            element.textContent = '';
            element.className = 'status';
        }
    }, 3000);
}