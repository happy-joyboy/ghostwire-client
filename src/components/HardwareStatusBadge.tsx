import React from "react";

export const HardwareStatusBadge = ({
  isConnected,
  isDark = true,
}: {
  isConnected: boolean;
  isDark?: boolean;
}) => {
  return (
    <div
      className={`flex items-center space-x-3 border px-3 py-2 rounded-sm shadow-md transition-colors ${isDark ? "border-gray-800 bg-black" : "border-gray-300 bg-white"}`}
    >
      <div className="relative flex h-3 w-3">
        {isConnected && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDark ? "bg-red-500" : "bg-red-500"}`}
          ></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? (isDark ? "bg-red-500" : "bg-red-500") : "bg-gray-500"}`}
        ></span>
      </div>

      <span
        className={`text-xs font-mono tracking-widest ${isConnected ? (isDark ? "text-red-500" : "text-red-600") : "text-gray-500"}`}
      >
        HSM: {isConnected ? "SECURE" : "UNREACHABLE"}
      </span>
    </div>
  );
};
