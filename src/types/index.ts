// This strictly defines the shape of our data across the entire application.
export interface MessagePayload {
  id: string;
  text?: string;        // Made optional, as ghost payloads might only have an image initially
  imageUrl?: string;    // Added to carry the Base64 stego-image across the WebSocket
  sender: 'You' | 'Peer' | 'System';
  timestamp: number;
  isGhostMode?: boolean;
}