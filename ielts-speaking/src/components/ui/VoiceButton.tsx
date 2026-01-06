"use client";

import { MicrophoneIcon } from "@/components/icons/MicrophoneIcon";

interface VoiceButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

export function VoiceButton({ isActive, onToggle }: VoiceButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center
        w-32 h-32 rounded-full
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-blue-300
        ${isActive 
          ? "bg-red-500 hover:bg-red-600 text-white" 
          : "bg-blue-500 hover:bg-blue-600 text-white"
        }
      `}
      aria-label={isActive ? "Stop recording" : "Start recording"}
    >
      {/* Pulse animation when active */}
      {isActive && (
        <>
          <span className="absolute w-full h-full rounded-full bg-red-400 animate-ping opacity-30" />
          <span className="absolute w-full h-full rounded-full bg-red-400 animate-pulse opacity-20" />
        </>
      )}
      
      <MicrophoneIcon className="w-12 h-12 relative z-10" />
    </button>
  );
}
