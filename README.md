# Gyro Privacy Display

**Motion-Sensitive Image Obfuscation Using Device Orientation**

A web application that creates a digital hardware-aware privacy filter for images. Depending on the device orientation (the "tilt angle" detected by the gyroscope), it displays the clear image or actively scrambles its pixels in real time.

## How it Works

1. Loads an image (uploaded by the user).
2. Uses a deterministic pixel-shuffling algorithm to scramble the image.
3. Accesses the device's gyroscope `beta` angle (front/back tilt).
4. If the phone is held within a designated flat angle threshold (e.g. ±12° from calibrated center), the full original image is revealed.
5. If the angle goes beyond the threshold, it reverts to scrambled noise instantly.

## Setup & Running

It's a pure front-end web project. Simply host it using any local static file server.

For example, using Python 3:
```bash
python -m http.server 8080
```

To test it properly, **you must use a smartphone**. 

1. Connect your smartphone exactly to the same local network as your computer.
2. Find out your computer's local IP (e.g. `192.168.x.x`). 
3. Access the URL `http://192.168.x.x:8080/` from the browser on your phone.
   *(Note: Apple iOS typically requires an HTTPS connection for accessing Device Orientation APIs. You may need to tunnel your connection using a tool like ngrok: `ngrok http 8080` and use the resulting HTTPS URL).*

## Evaluation

- **Scrambling strength:** Uniform scrambling using a non-linear transform.
- **Response time:** Direct manipulation of `ImageData` in Canvas, updated instantly upon `deviceorientation` event (< 50ms).
- **Security:** Fully executed gracefully in the web client. No images are sent to any external servers.

## Potential Extensions

- Face-tracking angle recognition as an alternative without using the Gyro API.
- Progressive unlocking (slowly unscrambling as the angle gets closer to flat).
- Support for complex passwords combined with tilt behavior.
# Guard-Me
