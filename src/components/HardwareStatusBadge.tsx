import React from 'react';

export const HardwareStatusBadge = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <div className="flex items-center space-x-3 border border-gray-800 bg-black px-3 py-2 rounded-sm shadow-md">
      {/* The Status Indicator Dot */}
      <div className="relative flex h-3 w-3">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-[#00ff00]' : 'bg-red-600'}`}></span>
      </div>
      
      {/* The Text Label */}
      <span className={`text-xs font-mono tracking-widest ${isConnected ? 'text-[#00ff00]' : 'text-red-600'}`}>
        HSM: {isConnected ? 'SECURE' : 'UNREACHABLE'}
      </span>
    </div>
  );
};