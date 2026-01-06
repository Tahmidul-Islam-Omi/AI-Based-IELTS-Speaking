"use client";

import { useState, useCallback } from "react";
import { VoiceButton, StatusText } from "@/components";
import { useAudioCapture } from "@/hooks";
import { sendAudioToBackend } from "@/lib/api";

export default function Home() {
  const [isActive, setIsActive] = useState(false);
  const { error, startCapture, stopCapture } = useAudioCapture();

  const handleToggle = useCallback(() => {
    if (isActive) {
      stopCapture();
      setIsActive(false);
    } else {
      startCapture(async (audioData) => {
        try {
          await sendAudioToBackend(audioData);
        } catch (err) {
          console.error("Failed to send audio:", err);
        }
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
