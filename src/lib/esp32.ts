// --- CONFIGURATION ---
const USE_MOCK_HARDWARE = false; 
const ESP32_IP = "http://10.61.2.50"; // I updated this to match Member 2's static IP from the code above!

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("HARDWARE_TIMEOUT");
    }
    throw error;
  }
};

export const checkStatus = async (): Promise<boolean> => {
  if (USE_MOCK_HARDWARE) return true; 

  try {
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
      // MATCH C++: Sending {"text": "..."}
      body: JSON.stringify({ text: plaintext }) 
    });
    
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    
    const result = await res.json();
    // MATCH C++: Expecting result.cipher
    return result.cipher; 
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
      // MATCH C++: Sending {"cipher": "..."}
      body: JSON.stringify({ cipher: ciphertext }) 
    });
    
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    
    const result = await res.json();
    // MATCH C++: Expecting result.text
    return result.text; 
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[DECRYPTION_FAILED: HSM Offline]";
  }
};
