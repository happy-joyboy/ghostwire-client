import React, { useState, useRef } from "react";
import { Ghost, Send, ImagePlus } from "lucide-react";

interface MessageInputBarProps {
  onSend: (text: string, isGhost: boolean, file?: File) => void;
  isDark?: boolean;
}

export const MessageInputBar = ({
  onSend,
  isDark = true,
}: MessageInputBarProps) => {
  const [input, setInput] = useState("");
  const [ghostMode, setGhostMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Define the max limit
  const MAX_CHARS = 500;

  const handleSendInitiate = () => {
    if (!input.trim() || input.length > MAX_CHARS) return; // Extra safety check

    if (ghostMode) {
      fileInputRef.current?.click();
    } else {
      onSend(input, false);
      setInput("");
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onSend(input, true, file);
    setInput("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendInitiate();
    }
  };

  return (
    <div
      className={`flex flex-col w-full ${isDark ? "bg-black" : "bg-gray-50"}`}
    >
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {ghostMode && (
        <div
          className={`text-xs text-purple-400 font-mono px-4 py-1 border-t flex items-center gap-2 ${isDark ? "border-purple-900/50 bg-purple-900/10" : "border-purple-200 bg-purple-100"}`}
        >
          <ImagePlus size={12} />
          <span>
            Steganography active: Pressing Send will prompt for a cover image.
          </span>
        </div>
      )}

      {/* NEW: Character Counter */}
      <div
        className={`flex justify-end px-4 pt-2 text-[10px] font-mono ${input.length >= MAX_CHARS ? "text-red-500 font-bold animate-pulse" : "text-gray-500"}`}
      >
        {input.length} / {MAX_CHARS}
      </div>

      <div className={`flex items-center gap-3 p-4 pt-1 border-t-0 w-full`}>
        <button
          onClick={() => setGhostMode(!ghostMode)}
          className={`p-3 border rounded-sm transition-all duration-300 flex items-center justify-center ${
            ghostMode
              ? isDark
                ? "border-purple-500 text-purple-400 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                : "border-purple-500 text-purple-600 bg-purple-100"
              : isDark
                ? "border-gray-700 text-gray-500 hover:text-gray-300 bg-[#111]"
                : "border-gray-300 text-gray-500 bg-white hover:bg-gray-100"
          }`}
          title={
            ghostMode
              ? "Ghost Mode Active: Payload will be injected into image"
              : "Toggle Ghost Mode"
          }
        >
          <Ghost size={20} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_CHARS} /* ✅ THE LIMIT IS APPLIED HERE */
          placeholder={
            ghostMode ? "Enter secret payload..." : "Transmit secure payload..."
          }
          className={`flex-1 border p-3 focus:outline-none font-mono text-sm transition-colors
            ${
              ghostMode
                ? isDark
                  ? "bg-[#0a0a0a] border-purple-900/50 text-purple-400 focus:border-purple-500"
                  : "bg-white border-purple-200 text-purple-700 focus:border-purple-500"
                : isDark
                  ? "bg-[#0a0a0a] border-red-500/30 text-red-500 focus:border-red-500"
                  : "bg-white border-red-300 text-red-700 focus:border-red-500"
            }`}
        />

        <button
          onClick={handleSendInitiate}
          disabled={!input.trim() || input.length > MAX_CHARS}
          className={`p-3 border rounded-sm transition-colors flex items-center justify-center
            ${
              input.trim()
                ? ghostMode
                  ? "border-purple-500 text-white bg-purple-500 hover:bg-purple-600"
                  : "border-red-500 text-white bg-red-500 hover:bg-red-600"
                : isDark
                  ? "border-gray-800 text-gray-600 bg-[#111] cursor-not-allowed"
                  : "border-gray-300 text-gray-400 bg-gray-200 cursor-not-allowed"
            }`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
