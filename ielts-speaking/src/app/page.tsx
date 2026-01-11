"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { VoiceButton } from "@/components";
import { useAudioCapture, useAudioPlayback, useWebSocket, useSilenceDetection } from "@/hooks";

export default function Home() {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const { error, startCapture, stopCapture } = useAudioCapture();
  const { playAudio } = useAudioPlayback();
  const { status, connect, disconnect, startListening, stopListening, sendAudioChunk, onAudioChunk } = useWebSocket();
  
  const isConversationActiveRef = useRef(false);

  // Silence detection with auto-stop callback
  const { analyzeAudioChunk, reset: resetSilenceDetection } = useSilenceDetection({
    silenceThreshold: -50,
    silenceDuration: 3000,
    onSilenceDetected: () => {
      console.log("🤐 Silence detected - sending to AI");
      stopCapture();
      stopListening();
    },
  });

  // Connect WebSocket on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount (when user closes tab/navigates away)
    return () => {
      if (!isConversationActiveRef.current) {
        disconnect();
      }
    };
  }, [connect, disconnect]);

  // Handle incoming audio chunks and restart listening after AI finishes
  useEffect(() => {
    onAudioChunk((audioData) => {
      playAudio(audioData);
    });
  }, [onAudioChunk, playAudio]);

  // Watch for status changes to restart listening after AI finishes
  useEffect(() => {
    if (status === "idle" && isConversationActiveRef.current) {
      // AI finished speaking, restart listening for next question
      console.log("🔄 AI finished - restarting listening for next question");
      setTimeout(() => {
        if (isConversationActiveRef.current) {
          startNewListeningSession();
        }
      }, 500); // Small delay before restarting
    }
  }, [status]);

  const startNewListeningSession = useCallback(() => {
    console.log("🎤 Starting new listening session");
    resetSilenceDetection();
    startListening();
    
    startCapture((audioData) => {
      // Analyze for silence
      analyzeAudioChunk(audioData);
      // Send to backend
      sendAudioChunk(audioData);
    });
  }, [startCapture, startListening, sendAudioChunk, analyzeAudioChunk, resetSilenceDetection]);

  const handleStartConversation = useCallback(() => {
    console.log("🟢 Conversation started");
    setIsConversationActive(true);
    isConversationActiveRef.current = true;
    startNewListeningSession();
  }, [startNewListeningSession]);

  const handleEndConversation = useCallback(() => {
    console.log("🔴 Conversation ended");
    setIsConversationActive(false);
    isConversationActiveRef.current = false;
    stopCapture();
    stopListening();
    // Don't disconnect - keep WebSocket alive for next conversation
  }, [stopCapture, stopListening]);

  const handleToggle = useCallback(() => {
    if (isConversationActive) {
      handleEndConversation();
    } else {
      handleStartConversation();
    }
  }, [isConversationActive, handleStartConversation, handleEndConversation]);

  const getStatusText = () => {
    if (!isConversationActive) {
      return "Tap to start conversation";
    }
    
    switch (status) {
      case "connecting": return "Connecting...";
      case "listening": return "Listening... (speak now)";
      case "silence_detected": return "Sending to AI...";
      case "processing": return "AI is thinking...";
      case "speaking": return "AI is speaking...";
      case "error": return "Error occurred";
      default: return "Listening... (speak now)";
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 dark:bg-gray-900">
      <VoiceButton 
        isActive={isConversationActive} 
        onToggle={handleToggle} 
      />
      <p className="text-lg text-gray-600 dark:text-gray-300">
        {getStatusText()}
      </p>
      {isConversationActive && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tap microphone to end conversation
        </p>
      )}
      {error && (
        <p className="text-red-500 text-sm">{error.message}</p>
      )}
    </main>
  );
}
