'use client';
import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { HardwareStatusBadge } from '../components/HardwareStatusBadge';
import { MessageBubble } from '../components/MessageBubble';
import { MessageInputBar } from '../components/MessageInputBar';
import { MessagePayload } from '../types';
import { checkStatus, encryptPayload, decryptPayload } from '../lib/esp32';
import { hideTextInImage } from '../lib/stego';

const socket = io('http://localhost:3001', {
  autoConnect: false,
});

export default function Home() {
  const [messages, setMessages] = useState<MessagePayload[]>([
    { id: 'boot', text: 'Initializing terminal...', sender: 'System', timestamp: Date.now() }
  ]);
  
  const [hsmConnected, setHsmConnected] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- THE HEARTBEAT LOGIC ---
  useEffect(() => {
    const pingHardware = async () => {
      const isOnline = await checkStatus();
      setHsmConnected(isOnline);
    };
    pingHardware();
    const intervalId = setInterval(pingHardware, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- WEBSOCKET INTEGRATION & RECEIVE INTERCEPT ---
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: `Global relay connected. Socket ID: ${socket.id}`,
        sender: 'System',
        timestamp: Date.now()
      }]);
    });

    socket.on('receive_message', async (payload: MessagePayload) => {
      try {
        // SCENARIO A: We received a Ghost Image Payload
        if (payload.imageUrl) {
          console.log("👻 GHOST IMAGE RECEIVED");
          const incomingGhost: MessagePayload = {
            ...payload,
            sender: 'Peer' // Render the image on the left
          };
          setMessages(prev => [...prev, incomingGhost]);
          return; // Stop here! The MessageBubble will handle extraction/decryption on click.
        }

        // SCENARIO B: We received a standard text ciphertext
        console.log("🔒 RAW CIPHERTEXT RECEIVED:", payload.text);
        const plaintext = await decryptPayload(payload.text!);
        console.log("🔓 DECRYPTED PLAINTEXT:", plaintext);

        const incomingText: MessagePayload = {
          ...payload,
          text: plaintext,
          sender: 'Peer'
        };
        
        setMessages(prev => [...prev, incomingText]);
      } catch (error) {
        console.error("Receive failed", error);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('receive_message');
      socket.disconnect();
    };
  }, []);

  // --- OUTBOUND LOGIC & SEND INTERCEPT ---
  // Note the new signature accepts the optional `file`
  const handleSendMessage = async (text: string, isGhost: boolean, file?: File) => {
    const messageId = Math.random().toString();
    const timestamp = Date.now();

    if (!hsmConnected) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: 'SYSTEM HALT: Cannot encrypt payload. HSM is disconnected.',
        sender: 'System',
        timestamp: Date.now()
      }]);
      return;
    }

    try {
      // 1. ALL payloads must be encrypted by the ESP32 first
      const ciphertext = await encryptPayload(text);

      if (isGhost && file) {
        // --- GHOST MODE FLOW ---
        console.log("👻 HIDING CIPHERTEXT IN IMAGE...");
        
        // 2. Inject ciphertext into the image pixels
        const stegoImageBase64 = await hideTextInImage(ciphertext, file);

        const payload: MessagePayload = {
          id: messageId,
          imageUrl: stegoImageBase64,
          sender: 'You',
          timestamp,
          isGhostMode: true
        };

        // Render the image locally so the sender sees what they uploaded
        setMessages(prev => [...prev, payload]);

        // Blast the heavy image over the sockets
        socket.emit('send_message', payload);

      } else {
        // --- NORMAL MODE FLOW ---
        console.log("🔒 ENCRYPTED TEXT READY FOR WIRE:", ciphertext);

        // Show plaintext locally
        setMessages(prev => [...prev, {
          id: messageId,
          text: text,
          sender: 'You',
          timestamp,
          isGhostMode: false
        }]);

        // Send ciphertext to peer
        socket.emit('send_message', {
          id: messageId,
          text: ciphertext,
          sender: 'You',
          timestamp,
          isGhostMode: false
        });
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: 'TRANSMISSION FAILED. PAYLOAD DROPPED.',
        sender: 'System',
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto border-x border-[#00ff00]/20 bg-black shadow-2xl shadow-[#00ff00]/5">
      <header className="flex justify-between items-center p-4 border-b border-[#00ff00]/30 bg-[#0a0a0a]">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-[0.3em] text-[#00ff00] drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
            GHOSTWIRE
          </h1>
          <span className="text-[10px] text-gray-500 font-mono">SECURE RELAY TERMINAL</span>
        </div>
        
        <HardwareStatusBadge isConnected={hsmConnected} /> 
      </header>

      <div className="flex-1 overflow-y-auto p-4 bg-[#050505] custom-scrollbar">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInputBar onSend={handleSendMessage} />
    </main>
  );
}