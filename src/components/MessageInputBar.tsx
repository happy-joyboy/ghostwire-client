import React, { useState, useRef } from 'react';
import { Ghost, Send, ImagePlus } from 'lucide-react';

interface MessageInputBarProps {
  // We upgraded the signature to include an optional File object
  onSend: (text: string, isGhost: boolean, file?: File) => void; 
}

export const MessageInputBar = ({ onSend }: MessageInputBarProps) => {
  const [input, setInput] = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  
  // A reference to the hidden file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Intercept the Send Action
  const handleSendInitiate = () => {
    if (!input.trim()) return;

    if (ghostMode) {
      // If in Ghost Mode, don't send yet! Open the file picker for the cover image.
      fileInputRef.current?.click();
    } else {
      // Normal mode: Send immediately
      onSend(input, false);
      setInput('');
    }
  };

  // 2. Handle the Image Selection
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Send the text, the ghost flag, AND the cover image file to page.tsx
    onSend(input, true, file);
    
    // Clean up the UI
    setInput('');
    
    // Reset the file input so the same image can be selected again later if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendInitiate();
    }
  };

  return (
    <div className="flex flex-col w-full bg-black">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" // Only allow images
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden" 
      />

      {/* Ghost Mode Status Bar (Appears when active) */}
      {ghostMode && (
        <div className="text-xs text-purple-400 font-mono px-4 py-1 border-t border-purple-900/50 bg-purple-900/10 flex items-center gap-2">
          <ImagePlus size={12} />
          <span>Steganography active: Pressing Send will prompt for a cover image.</span>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 border-t border-[#00ff00]/30 w-full">
        {/* Ghost Mode Toggle */}
        <button 
          onClick={() => setGhostMode(!ghostMode)}
          className={`p-3 border rounded-sm transition-all duration-300 flex items-center justify-center ${
            ghostMode 
              ? 'border-purple-500 text-purple-400 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
              : 'border-gray-700 text-gray-500 hover:text-gray-300 bg-[#111]'
          }`}
          title={ghostMode ? "Ghost Mode Active: Payload will be injected into image" : "Toggle Ghost Mode"}
        >
          <Ghost size={20} />
        </button>

        {/* Main Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ghostMode ? "Enter secret payload..." : "Transmit secure payload..."}
          className={`flex-1 bg-[#0a0a0a] border p-3 focus:outline-none font-mono text-sm transition-colors
            ${ghostMode 
              ? 'border-purple-900/50 text-purple-400 focus:border-purple-500' 
              : 'border-[#00ff00]/30 text-[#00ff00] focus:border-[#00ff00]'
            }`}
        />

        {/* Send Button */}
        <button 
          onClick={handleSendInitiate}
          disabled={!input.trim()}
          className={`p-3 border rounded-sm transition-colors flex items-center justify-center
            ${input.trim() 
              ? ghostMode
                ? 'border-purple-500 text-black bg-purple-500 hover:bg-purple-400' 
                : 'border-[#00ff00] text-black bg-[#00ff00] hover:bg-[#00cc00]' 
              : 'border-gray-800 text-gray-600 bg-[#111] cursor-not-allowed'
            }`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};