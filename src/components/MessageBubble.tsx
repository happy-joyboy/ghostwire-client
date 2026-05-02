import React, { useState } from 'react';
import { MessagePayload } from '../types';
import { extractTextFromImage } from '../lib/stego';
import { decryptPayload } from '../lib/esp32';
import { Lock, Unlock, Loader2, Image as ImageIcon } from 'lucide-react';

export const MessageBubble = ({ message }: { message: MessagePayload }) => {
  const { sender, text, timestamp, imageUrl, isGhostMode } = message;
  
  // Interactive UI state for the decryption process
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedText, setRevealedText] = useState<string | null>(null);

  const timeString = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  if (sender === 'System') {
    return (
      <div className="w-full flex justify-center my-4">
        <span className="text-gray-600 text-xs tracking-widest uppercase font-mono">
          [ {text} ]
        </span>
      </div>
    );
  }

  const isMe = sender === 'You';
  const isGhost = isGhostMode || !!imageUrl;

  // The extraction and decryption flow
  const handleReveal = async () => {
    if (!imageUrl) return;
    setIsRevealing(true);
    
    try {
      // 1. Pull the ciphertext out of the image pixels
      const ciphertext = await extractTextFromImage(imageUrl);
      // 2. Send the ciphertext to the hardware for decryption
      const plaintext = await decryptPayload(ciphertext);
      
      setRevealedText(plaintext);
    } catch (error) {
      console.error(error);
      setRevealedText("[ DECERTIFICATION ERROR: PAYLOAD CORRUPTED ]");
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className={`w-full flex my-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[75%] p-3 border font-mono shadow-sm flex flex-col gap-2 transition-colors duration-500
          ${isMe 
            ? 'bg-black border-[#00ff00] text-[#00ff00] shadow-[#00ff00]/10' 
            : 'bg-[#111111] border-gray-600 text-gray-300 shadow-gray-900/20'
          }
          ${isGhost && revealedText ? 'border-purple-500 shadow-purple-500/20' : ''}
          `}
      >
        {/* Header row */}
        <div className={`flex justify-between items-baseline pb-1 border-b opacity-70 text-xs
          ${isMe ? 'border-[#00ff00]/50' : 'border-gray-600'}
          ${isGhost && revealedText ? 'border-purple-500/50' : ''}`}
        >
          <div className="flex items-center gap-2">
            {isGhost && (revealedText ? <Unlock size={12} className="text-purple-400" /> : <Lock size={12} />)}
            <span className="uppercase font-bold tracking-wider">{sender}</span>
          </div>
          <span className="text-[10px] ml-6 opacity-80">{timeString}</span>
        </div>
        
        {/* Payload body */}
        <div className="text-sm whitespace-pre-wrap break-words">
          
          {/* Scenario 1: It's an image payload that hasn't been revealed yet */}
          {imageUrl && !revealedText && (
            <div className="relative group cursor-pointer" onClick={handleReveal}>
              <img 
                src={imageUrl.split('___GHOST_PAYLOAD___')[0]}
                alt="Encrypted Payload" 
                className={`w-full max-w-sm rounded border ${isMe ? 'border-[#00ff00]/30' : 'border-gray-700'} opacity-80 group-hover:opacity-30 transition-opacity duration-300`}
              />
              
              {/* Overlay for Reveal Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isRevealing ? (
                  <div className="bg-black/90 text-purple-400 px-4 py-2 rounded flex items-center gap-2 border border-purple-500/50 shadow-lg">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold tracking-widest">DECRYPTING...</span>
                  </div>
                ) : (
                  <div className="bg-black/90 text-gray-300 px-4 py-2 rounded flex items-center gap-2 border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                    <Lock size={16} />
                    <span className="text-xs font-bold tracking-widest">CLICK TO REVEAL</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenario 2: It's a revealed Ghost payload */}
          {revealedText && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] text-purple-400 mb-1 border-b border-purple-900/30 pb-1 tracking-widest">
                <ImageIcon size={12} />
                <span>EXTRACTED FROM IMAGE</span>
              </div>
              <span className="text-purple-300">{revealedText}</span>
            </div>
          )}

          {/* Scenario 3: Normal text message */}
          {!imageUrl && !revealedText && text}
          
        </div>
      </div>
    </div>
  );
};