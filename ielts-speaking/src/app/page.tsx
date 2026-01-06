"use client";

import { useState, useCallback } from "react";
import { VoiceButton, StatusText } from "@/components";
import { useAudioCapture, useAudioPlayback } from "@/hooks";
import { sendAudioToBackend, startSession, stopSessionAndGetResponse, base64ToArrayBuffer } from "@/lib/api";

export default function Home() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const { error, startCapture, stopCapture } = useAudioCapture();
  const { playAudio } = useAudioPlayback();

  const handleToggle = useCallback(async () => {
    if (isActive) {
      // Stop recording
      stopCapture();
      setIsActive(false);
      setStatus("processing");

      try {
        // Get AI response
        const responseAudio = await stopSessionAndGetResponse();

        if (responseAudio) {
          setStatus("speaking");
          // Convert base64 to ArrayBuffer and play
          const audioBuffer = base64ToArrayBuffer(responseAudio);
          await playAudio(audioBuffer);
        }
      } catch (err) {
        console.error("Error getting response:", err);
      }

      setStatus("idle");
    } else {
      // Start recording
      setStatus("listening");
      await startSession();

      startCapture(async (audioData) => {
        try {
          await sendAudioToBackend(audioData);
        } catch (err) {
          console.error("Failed to send audio:", err);
        }
      });
      setIsActive(true);
    }
  }, [isActive, startCapture, stopCapture, playAudio]);

  const getStatusText = () => {
    switch (status) {
      case "listening": return "Listening...";
      case "processing": return "Processing...";
      case "speaking": return "AI Speaking...";
      default: return "Tap to start";
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 dark:bg-gray-900">
      <VoiceButton 
        isActive={isActive || status === "processing" || status === "speaking"} 
        onToggle={handleToggle} 
      />
      <p className="text-lg text-gray-600 dark:text-gray-300">
        {getStatusText()}
      </p>
      {error && (
        <p className="text-red-500 text-sm">{error.message}</p>
      )}
    </main>
  );
}
