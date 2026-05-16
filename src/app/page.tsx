"use client";
import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { HardwareStatusBadge } from "../components/HardwareStatusBadge";
import { MessageBubble } from "../components/MessageBubble";
import { MessageInputBar } from "../components/MessageInputBar";
import { MessagePayload } from "../types";
import { Moon, Sun, Shield, KeyRound } from "lucide-react";
import {
  checkStatus,
  encryptPayload,
  decryptPayload,
  getPublicKey,
  setPeerKey,
  setHardwarePort,
} from "../lib/esp32";
import { hideTextInImage } from "../lib/stego";

// Make sure to use your computer's actual local IP address here!
const socket = io("http://192.168.1.9:3001", {
  autoConnect: false,
});

export default function Home() {
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [hsmConnected, setHsmConnected] = useState<boolean>(false);
  const [activeUser, setActiveUser] = useState<"A" | "B">("A");

  // NEW: Theme State
  const [isDark, setIsDark] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsMounted(true);
    setMessages([
      {
        id: Math.random().toString(),
        text: "Hardware Security Module (HSM) Initialized.",
        sender: "System",
        timestamp: Date.now(),
      },
      {
        id: Math.random().toString(),
        text: "Awaiting Diffie-Hellman Handshake...",
        sender: "System",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const pingHardware = async () => {
      const isOnline = await checkStatus();
      setHsmConnected(isOnline);
    };
    pingHardware();
    const intervalId = setInterval(pingHardware, 5000);
    return () => clearInterval(intervalId);
  }, []);

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
        if (payload.isKeyExchange && payload.publicKey) {
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              text: `[DH HANDSHAKE] Received Remote Public Key. Securing Port ${activeUser === "A" ? "80" : "81"}...`,
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

        if (payload.imageUrl) {
          const incomingGhost: MessagePayload = { ...payload, sender: "Peer" };
          setMessages((prev) => [...prev, incomingGhost]);
          return;
        }

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
  }, [activeUser]);

  const handleUserToggle = (user: "A" | "B") => {
    setActiveUser(user);
    setHardwarePort(user === "A" ? 80 : 81);

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        text: `[SYSTEM] Switched identity to User ${user} (Port ${user === "A" ? 80 : 81}). Handshake required.`,
        sender: "System",
        timestamp: Date.now(),
      },
    ]);
  };

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

  if (!isMounted) {
    return (
      <main
        className={`flex flex-col h-screen max-w-4xl mx-auto border-x ${isDark ? "border-red-500/20 bg-black shadow-red-500/5" : "border-red-600/20 bg-gray-50 shadow-red-600/5"}`}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-[#050505]" : "bg-gray-100"} transition-colors duration-300 font-mono`}
    >
      <main
        className={`flex flex-col h-screen max-w-4xl mx-auto border-x shadow-2xl ${isDark ? "border-red-500/20 bg-black shadow-red-500/5" : "border-red-600/20 bg-white shadow-red-600/5"}`}
      >
        <header
          className={`flex justify-between items-center p-4 border-b ${isDark ? "border-red-500/30 bg-[#0a0a0a]" : "border-red-600/30 bg-gray-50"}`}
        >
          <div className="flex items-center gap-2">
            <Shield
              size={24}
              className={isDark ? "text-red-500" : "text-red-600"}
            />
            <div className="flex flex-col">
              <h1
                className={`text-xl font-bold tracking-[0.3em] ${isDark ? "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "text-red-600"}`}
              >
                GHOSTWIRE
              </h1>
              <span className="text-[10px] text-gray-500 font-mono">
                SECURE RELAY TERMINAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1 hover:opacity-70 transition-opacity mr-2"
            >
              {isDark ? (
                <Sun size={18} className="text-gray-400" />
              ) : (
                <Moon size={18} className="text-gray-600" />
              )}
            </button>

            <div
              className={`flex border rounded p-1 text-xs font-mono mr-2 ${isDark ? "bg-[#111] border-gray-800" : "bg-gray-200 border-gray-300"}`}
            >
              <button
                onClick={() => handleUserToggle("A")}
                className={`px-3 py-1 rounded transition-colors ${
                  activeUser === "A"
                    ? isDark
                      ? "bg-red-500 text-black font-bold"
                      : "bg-red-600 text-white font-bold"
                    : isDark
                      ? "text-gray-500 hover:text-gray-300"
                      : "text-gray-600 hover:text-gray-800"
                }`}
              >
                USER A
              </button>
              <button
                onClick={() => handleUserToggle("B")}
                className={`px-3 py-1 rounded transition-colors ${
                  activeUser === "B"
                    ? isDark
                      ? "bg-red-500 text-black font-bold"
                      : "bg-red-600 text-white font-bold"
                    : isDark
                      ? "text-gray-500 hover:text-gray-300"
                      : "text-gray-600 hover:text-gray-800"
                }`}
              >
                USER B
              </button>
            </div>

            <button
              onClick={initiateHandshake}
              disabled={!hsmConnected}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold tracking-widest transition-all
                ${
                  hsmConnected
                    ? isDark
                      ? "border-red-500/50 text-red-500 hover:bg-red-500/10 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                      : "border-red-600 text-red-600 hover:bg-red-50 shadow-sm"
                    : "border-gray-800 text-gray-600 opacity-50 cursor-not-allowed"
                }`}
            >
              <KeyRound size={14} />
              <span>EXCHANGE KEYS</span>
            </button>

            <HardwareStatusBadge isConnected={hsmConnected} isDark={isDark} />
          </div>
        </header>

        <div
          className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${isDark ? "bg-[#050505]" : "bg-gray-50"}`}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isDark={isDark} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <MessageInputBar onSend={handleSendMessage} isDark={isDark} />
      </main>
    </div>
  );
}
