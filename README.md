Here’s a clean, copy-paste-ready **Markdown README**:


# 🟢 GhostWire: Secure Relay Terminal (Client)

This is the frontend interface for the GhostWire college project. It is a secure, real-time terminal built with **Next.js**, **Tailwind CSS**, and **Socket.io-client**.

This client features:
- Zero-knowledge communication flow  
- Hardware-bridge API to connect to an external ESP32 encryption module  
- Steganography engine wrapper for hiding ciphertexts within images  

---

## 🚀 Setup & Installation

Before you begin, ensure you have **Node.js** installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/YourUsername/ghostwire-client.git
cd ghostwire-client


### 2. Install dependencies

Because `node_modules` is ignored by Git, you must install the packages locally.

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

> ⚠️ Ensure the `ghostwire-relay` server is also running on port **3001**, or the terminal will not connect!

---

## 🛠️ Team Integration Guide

This architecture was built so that the ESP32 logic and Steganography logic are completely isolated from the React UI.

---

### 🔌 For Member 2 (Hardware / ESP32)

**Integration file:**

```
src/lib/esp32.ts
```

Steps:

* Set `USE_MOCK_HARDWARE = false`
* Update `ESP32_IP` to match your microcontroller's local IP

Behavior:

* The UI will send `fetch()` requests to your C++ web server:

  * `encryptPayload`
  * `decryptPayload`
* Includes a **5-second heartbeat**

  * If ESP32 disconnects → UI badge turns **red** and blocks transmissions

---

### 🖼️ For Member 4 (Steganography / Canvas API)

**Integration file:**

```
src/lib/stego.ts
```

Current state:

* Uses a mock engine that appends text to Base64 image data

You need to:

* Implement `hideTextInImage(ciphertext, file)`

  * Use Canvas API to modify RGB pixels and embed ciphertext
* Implement `extractTextFromImage(stegoImage)`

  * Scan pixels and extract hidden data

> ⚠️ Important:
> Maintain `MAX_WIDTH = 500` before applying steganography
> Otherwise, the image may exceed Socket.io’s **1MB payload limit**

---

## 📁 Architecture Overview

```
src/
├── app/
│   └── page.tsx        # Main switchboard (send/receive logic)
│
├── components/         # Modular React UI
│   ├── Input Bar
│   ├── Bubble
│   └── Hardware Badge
│
├── lib/                # External integrations
│   ├── esp32.ts        # Hardware bridge
│   └── stego.ts        # Steganography engine
```

---

## ⚡ Notes

* Designed for modular team collaboration
* Hardware + Stego layers are fully decoupled from UI
* Optimized for real-time encrypted communication

---

```

If you want, I can also:
- Make it **more ATS-style professional** (for portfolio use)
- Add **badges (build, license, tech stack)**
- Or convert it into a **GitHub project-level README with visuals**
```
