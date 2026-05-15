// --- CONFIGURATION ---
const USE_MOCK_HARDWARE = false; 
const ESP32_IP = "http://10.61.2.50"; // Matches the C++ static IP

// Default to User A (Port 80)
let currentPort = 80;

// NEW: Allows the UI to change the port dynamically
export const setHardwarePort = (port: number) => {
  currentPort = port;
  console.log(`[NETWORK] Hardware bridge redirected to port ${currentPort}`);
};

// NEW: Helper to build the correct URL
const getBaseUrl = () => `${ESP32_IP}:${currentPort}`;

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
    if (error instanceof Error && error.name === 'AbortError') throw new Error("HARDWARE_TIMEOUT");
    throw error;
  }
};

export const checkStatus = async (): Promise<boolean> => {
  if (USE_MOCK_HARDWARE) return true; 
  try {
    const res = await fetchWithTimeout(`${getBaseUrl()}/status`, { method: 'GET' });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const getPublicKey = async (): Promise<string> => {
  if (USE_MOCK_HARDWARE) return "MOCK_PUB_KEY_123456789";
  
  const res = await fetchWithTimeout(`${getBaseUrl()}/handshake`, { method: 'GET' });
  if (!res.ok) throw new Error("Handshake failed");
  
  const data = await res.json();
  return data.publicKey; 
};

export const setPeerKey = async (peerKey: string): Promise<boolean> => {
  if (USE_MOCK_HARDWARE) return true;
  
  const res = await fetchWithTimeout(`${getBaseUrl()}/set_peer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peerKey: peerKey }) 
  });
  
  return res.ok;
};

export const encryptPayload = async (plaintext: string): Promise<string> => {
  if (USE_MOCK_HARDWARE) return `ENC_[${btoa(plaintext)}]`;
  try {
    const res = await fetchWithTimeout(`${getBaseUrl()}/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: plaintext }) 
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const result = await res.json();
    return result.cipher; 
  } catch (error) {
    throw new Error("HSM_ERROR");
  }
};

export const decryptPayload = async (ciphertext: string): Promise<string> => {
  if (USE_MOCK_HARDWARE) return ciphertext;
  try {
    const res = await fetchWithTimeout(`${getBaseUrl()}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cipher: ciphertext }) 
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const result = await res.json();
    return result.text; 
  } catch (error) {
    return "[DECRYPTION_FAILED: HSM Offline or Key Mismatch]";
  }
};
