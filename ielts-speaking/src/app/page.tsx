"use client";

import { useState, useCallback } from "react";
import { VoiceButton, StatusText } from "@/components";
import { useAudioCapture } from "@/hooks";

export default function Home() {
  const [isActive, setIsActive] = useState(false);
  const { state, error, startCapture, stopCapture } = useAudioCapture();

  const handleToggle = useCallback(() => {
    if (isActive) {
      stopCapture();
      setIsActive(false);
    } else {
      startCapture((audioData) => {
        // For now, just receive audio data - will send to backend in Phase 3
        // Logging is already in the hook
      });
      setIsActive(true);
    }
  }, [isActive, startCapture, stopCapture]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 dark:bg-gray-900">
      <VoiceButton isActive={isActive} onToggle={handleToggle} />
      <StatusText isActive={isActive} />
      {error && (
        <p className="text-red-500 text-sm">{error.message}</p>
      )}
    </main>
  );
}
