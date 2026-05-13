"use client";
import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { HardwareStatusBadge } from "../components/HardwareStatusBadge";
import { MessageBubble } from "../components/MessageBubble";
import { MessageInputBar } from "../components/MessageInputBar";
import { MessagePayload } from "../types";
import {
  checkStatus,
  encryptPayload,
  decryptPayload,
  getPublicKey,
  setPeerKey,
} from "../lib/esp32";
import { hideTextInImage } from "../lib/stego";
import { KeyRound } from "lucide-react";

// Make sure to use your computer's actual local IP address here!
const socket = io("http://192.168.1.9:3001", {
  autoConnect: false,
});

export default function Home() {
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [hsmConnected, setHsmConnected] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initializer Hook
  useEffect(() => {
    setIsMounted(true);
    setMessages([
      {
        id: Math.random().toString(),
        text: "Initializing terminal...",
        sender: "System",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // 2. Auto-scroll Hook
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Hardware Polling Hook
  useEffect(() => {
    const pingHardware = async () => {
      const isOnline = await checkStatus();
      setHsmConnected(isOnline);
    };
    pingHardware();
    const intervalId = setInterval(pingHardware, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // 4. Socket Connection & Messaging Hook
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          text: `Global relay connected. Socket ID: ${socket.id}`,
          sender: "System",
          timestamp: Date.now(),
        },
      ]);
    });

    socket.on("receive_message", async (payload: MessagePayload) => {
      try {
        // --- SCENARIO A: DIFFIE-HELLMAN KEY EXCHANGE ---
        if (payload.isKeyExchange && payload.publicKey) {
          console.log("🔑 RECEIVED PEER PUBLIC KEY:", payload.publicKey);

          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              text: `[DH HANDSHAKE] Received Remote Public Key. Securing hardware session...`,
              sender: "System",
              timestamp: Date.now(),
            },
          ]);

          const success = await setPeerKey(payload.publicKey);

          if (success) {
            setMessages((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                text: `[AES LOCKED] Hardware secure session established! You may now transmit.`,
                sender: "System",
                timestamp: Date.now(),
              },
            ]);
          }
          return;
        }

        // --- SCENARIO B: GHOST IMAGE ---
        if (payload.imageUrl) {
          const incomingGhost: MessagePayload = { ...payload, sender: "Peer" };
          setMessages((prev) => [...prev, incomingGhost]);
          return;
        }

        // --- SCENARIO C: STANDARD CIPHERTEXT ---
        const plaintext = await decryptPayload(payload.text!);
        const incomingText: MessagePayload = {
          ...payload,
          text: plaintext,
          sender: "Peer",
        };
        setMessages((prev) => [...prev, incomingText]);
      } catch (error) {
        console.error("Receive failed", error);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("receive_message");
      socket.disconnect();
    };
  }, []);

  const initiateHandshake = async () => {
    if (!hsmConnected) return;

    try {
      const myPublicKey = await getPublicKey();

      socket.emit("send_message", {
        id: Math.random().toString(),
        sender: "System",
        timestamp: Date.now(),
        isKeyExchange: true,
        publicKey: myPublicKey,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          text: `[DH HANDSHAKE] Transmitted Local Public Key to remote peer.`,
          sender: "System",
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error("Handshake generation failed", error);
    }
  };

  const handleSendMessage = async (
    text: string,
    isGhost: boolean,
    file?: File,
  ) => {
    const messageId = Math.random().toString();
    const timestamp = Date.now();

    if (!hsmConnected) return;

    try {
      const ciphertext = await encryptPayload(text);

      if (isGhost && file) {
        const stegoImageBase64 = await hideTextInImage(ciphertext, file);
        const payload: MessagePayload = {
          id: messageId,
          imageUrl: stegoImageBase64,
          sender: "You",
          timestamp,
          isGhostMode: true,
        };
        setMessages((prev) => [...prev, payload]);
        socket.emit("send_message", payload);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            text: text,
            sender: "You",
            timestamp,
            isGhostMode: false,
          },
        ]);
        socket.emit("send_message", {
          id: messageId,
          text: ciphertext,
          sender: "You",
          timestamp,
          isGhostMode: false,
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          text: "TRANSMISSION FAILED: Session might not be initialized.",
          sender: "System",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // ✅ CRITICAL FIX: The return null must go HERE, after all useEffects are declared!
  if (!isMounted) {
    return (
      <main className="flex flex-col h-screen max-w-4xl mx-auto border-x border-[#00ff00]/20 bg-black shadow-2xl shadow-[#00ff00]/5" />
    );
  }

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto border-x border-[#00ff00]/20 bg-black shadow-2xl shadow-[#00ff00]/5">
      <header className="flex justify-between items-center p-4 border-b border-[#00ff00]/30 bg-[#0a0a0a]">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-[0.3em] text-[#00ff00] drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
            GHOSTWIRE
          </h1>
          <span className="text-[10px] text-gray-500 font-mono">
            SECURE RELAY TERMINAL
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={initiateHandshake}
            disabled={!hsmConnected}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold tracking-widest transition-all
              ${
                hsmConnected
                  ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                  : "border-gray-800 text-gray-600 opacity-50 cursor-not-allowed"
              }`}
          >
            <KeyRound size={14} />
            <span>EXCHANGE KEYS</span>
          </button>

          <HardwareStatusBadge isConnected={hsmConnected} />
        </div>
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
