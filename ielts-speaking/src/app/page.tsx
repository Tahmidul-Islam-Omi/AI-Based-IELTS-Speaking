"use client";

import { useState, useCallback, useEffect } from "react";
import { VoiceButton } from "@/components";
import { useAudioCapture, useAudioPlayback, useWebSocket } from "@/hooks";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const { error, startCapture, stopCapture } = useAudioCapture();
  const { playAudio } = useAudioPlayback();
  const { status, connect, startRecording, stopRecording, sendAudioChunk, onAudioChunk } = useWebSocket();

  // Connect WebSocket on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Handle incoming audio chunks
  useEffect(() => {
    onAudioChunk((audioData) => {
      playAudio(audioData);
    });
  }, [onAudioChunk, playAudio]);

  const handleToggle = useCallback(() => {
    if (isRecording) {
      // Stop recording
      stopCapture();
      stopRecording();
      setIsRecording(false);
    } else {
      // Start recording
      startRecording();
      startCapture((audioData) => {
        sendAudioChunk(audioData);
      });
      setIsRecording(true);
    }
  }, [isRecording, startCapture, stopCapture, startRecording, stopRecording, sendAudioChunk]);

  const getStatusText = () => {
    switch (status) {
      case "connecting": return "Connecting...";
      case "recording": return "Listening...";
      case "processing": return "Processing...";
      case "speaking": return "AI Speaking...";
      case "error": return "Error occurred";
      default: return "Tap to start";
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 dark:bg-gray-900">
      <VoiceButton 
        isActive={isRecording || status === "processing" || status === "speaking"} 
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
