// --- CONFIGURATION ---
// Set to false to test the timeout and failure states
const USE_MOCK_HARDWARE = true; 

// The static IP assigned to the ESP32 on your local network
const ESP32_IP = "http://192.168.43.50"; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- THE FIX: Custom Fetch with strict timeout ---
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    // If the error was our manual abort, throw a specific timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("HARDWARE_TIMEOUT");
    }
    throw error;
  }
};

export const checkStatus = async (): Promise<boolean> => {
  if (USE_MOCK_HARDWARE) return true; 

  try {
    // Fails instantly after 2 seconds if ESP32 is missing
    const res = await fetchWithTimeout(`${ESP32_IP}/status`, { method: 'GET' });
    return res.ok;
  } catch (error) {
    console.error("Hardware Unreachable (Timeout or Network Drop)");
    return false;
  }
};

export const encryptPayload = async (plaintext: string): Promise<string> => {
  if (USE_MOCK_HARDWARE) {
    await delay(300);
    return `ENC_[${btoa(plaintext)}]`;
  }

  try {
    const res = await fetchWithTimeout(`${ESP32_IP}/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: plaintext })
    });
    const result = await res.json();
    return result.ciphertext;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("HSM_ERROR");
  }
};

export const decryptPayload = async (ciphertext: string): Promise<string> => {
  if (USE_MOCK_HARDWARE) {
    await delay(300);
    if (ciphertext.startsWith('ENC_[')) {
      try {
        const extracted = ciphertext.replace('ENC_[', '').replace(']', '');
        return atob(extracted);
      } catch {
        return "[DECRYPTION_FAILED: Invalid Payload]";
      }
    }
    return ciphertext;
  }

  try {
    const res = await fetchWithTimeout(`${ESP32_IP}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: ciphertext })
    });
    const result = await res.json();
    return result.plaintext;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[DECRYPTION_FAILED: HSM Offline]";
  }
};