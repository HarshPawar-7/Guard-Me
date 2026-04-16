
## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, etc.)
- (Optional) A local web server for development (e.g., Live Server in VSCode)

### Running Locally

1. Clone or download this repository.
2. Open the folder in your code editor.
3. Launch `index.html` using a local server:
   - **VSCode**: Install the **Live Server** extension, right‑click `index.html` and select **Open with Live Server**.
   - **Python**: Run `python -m http.server 8000` and visit `http://localhost:8000`.
4. Start hiding or extracting data!

### Deploying on Netlify

1. Push the folder to a GitHub repository.
2. Log in to [Netlify](https://netlify.com) and click **New site from Git**.
3. Connect your repository and select the branch.
4. Set **Build command** and **Publish directory** to empty (the site is static).
5. Click **Deploy site**.

Your app will be live at a `*.netlify.app` URL.

## 🖥️ Usage

### Hide Data

1. Select a **medical image** (PNG or JPEG).
2. Enter the **patient data** (can be JSON, plain text, etc.).
3. (Optional) Provide a **password** for encryption.
4. Click **Hide & Download Image**.  
   A new image (`stego_medical.png`) will be saved to your device. This image looks identical to the original but contains your hidden data.

### Extract Data

1. Upload the **stego image** (the one you previously generated).
2. If you used a password during hiding, enter it here.
3. Click **Extract Data**.  
   The extracted data will appear in a styled card with a **Copy** button. If the password is wrong, an error message is shown.

## 🛠️ Technologies Used

- **HTML5** – Structure
- **CSS3** – Styling, responsive layout
- **JavaScript (ES6)** – Steganography logic, canvas manipulation, XOR encryption

## 🔒 Security Note

This tool uses a simple **XOR cipher** for password protection. While it adds a layer of security, it is **not** cryptographically strong. For production or sensitive data, consider using a proper encryption library like AES.

## 📌 Future Enhancements

- Support for **DICOM** medical images.
- **Stronger encryption** (AES‑256).
- **Drag‑and‑drop** image upload.
- **Batch processing** for multiple images.
- **Mobile‑friendly** design improvements.

## 📄 License

This project is open‑source and available under the [MIT License](LICENSE).

---

**Happy steganography!** 🕵️‍♂️