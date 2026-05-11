export interface MessagePayload {
  id: string;
  text?: string;
  imageUrl?: string;
  sender: "You" | "Peer" | "System";
  timestamp: number;
  isGhostMode?: boolean;

  // --- NEW: Diffie-Hellman Handshake Flags ---
  isKeyExchange?: boolean;
  publicKey?: string;
}
