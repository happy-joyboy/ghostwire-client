import React, { useState } from "react";
import { MessagePayload } from "../types";
import { extractTextFromImage } from "../lib/stego";
import { decryptPayload } from "../lib/esp32";
import { Lock, Unlock, Loader2, Image as ImageIcon } from "lucide-react";

export const MessageBubble = ({
  message,
  isDark = true,
}: {
  message: MessagePayload;
  isDark?: boolean;
}) => {
  const { sender, text, timestamp, imageUrl, isGhostMode } = message;

  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedText, setRevealedText] = useState<string | null>(null);

  const timeString = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (sender === "System") {
    return (
      <div className="w-full flex justify-center my-4">
        <span className="text-gray-500 text-xs tracking-widest uppercase font-mono">
          [ {text} ]
        </span>
      </div>
    );
  }

  const isMe = sender === "You";
  const isGhost = isGhostMode || !!imageUrl;

  const handleReveal = async () => {
    if (!imageUrl) return;
    setIsRevealing(true);

    try {
      const ciphertext = await extractTextFromImage(imageUrl);
      const plaintext = await decryptPayload(ciphertext);
      setRevealedText(plaintext);
    } catch (error) {
      console.error(error);
      setRevealedText("[ DECERTIFICATION ERROR: PAYLOAD CORRUPTED ]");
    } finally {
      setIsRevealing(false);
    }
  };

  const cleanImageUrl = imageUrl
    ? imageUrl.split("___GHOST_PAYLOAD___")[0]
    : "";

  return (
    <div
      className={`w-full flex my-3 ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] p-3 border font-mono shadow-sm flex flex-col gap-2 transition-colors duration-500
          ${
            isMe
              ? isDark
                ? "bg-black border-red-500 text-red-500 shadow-red-500/10"
                : "bg-red-50 border-red-600 text-red-700 shadow-red-600/10"
              : isDark
                ? "bg-[#111111] border-gray-600 text-gray-300 shadow-gray-900/20"
                : "bg-white border-gray-300 text-gray-800 shadow-sm"
          }
          ${isGhost && revealedText ? "border-purple-500 shadow-purple-500/20" : ""}
          `}
      >
        <div
          className={`flex justify-between items-baseline pb-1 border-b opacity-70 text-xs
          ${isMe ? (isDark ? "border-red-500/50" : "border-red-600/50") : isDark ? "border-gray-600" : "border-gray-300"}
          ${isGhost && revealedText ? "border-purple-500/50" : ""}`}
        >
          <div className="flex items-center gap-2">
            {isGhost &&
              (revealedText ? (
                <Unlock size={12} className="text-purple-400" />
              ) : (
                <Lock size={12} />
              ))}
            <span className="uppercase font-bold tracking-wider">{sender}</span>
          </div>
          <span className="text-[10px] ml-6 opacity-80">{timeString}</span>
        </div>

        <div className="text-sm whitespace-pre-wrap break-words">
          {imageUrl && !revealedText && (
            <div
              className="relative group cursor-pointer"
              onClick={handleReveal}
            >
              <img
                src={cleanImageUrl}
                alt="Encrypted Payload"
                className={`w-full max-w-sm rounded border ${isMe ? (isDark ? "border-red-500/30" : "border-red-600/30") : "border-gray-700"} opacity-80 group-hover:opacity-30 transition-opacity duration-300`}
              />

              <div className="absolute inset-0 flex items-center justify-center">
                {isRevealing ? (
                  <div
                    className={`bg-black/90 text-purple-400 px-4 py-2 rounded flex items-center gap-2 border border-purple-500/50 shadow-lg`}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold tracking-widest">
                      DECRYPTING...
                    </span>
                  </div>
                ) : (
                  <div
                    className={`bg-black/90 text-gray-300 px-4 py-2 rounded flex items-center gap-2 border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg`}
                  >
                    <Lock size={16} />
                    <span className="text-xs font-bold tracking-widest">
                      CLICK TO REVEAL
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {revealedText && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] text-purple-400 mb-1 border-b border-purple-900/30 pb-1 tracking-widest">
                <ImageIcon size={12} />
                <span>EXTRACTED FROM IMAGE</span>
              </div>
              <span className="text-purple-300">{revealedText}</span>
            </div>
          )}

          {!imageUrl && !revealedText && text}
        </div>
      </div>
    </div>
  );
};
