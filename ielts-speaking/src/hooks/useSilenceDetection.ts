"use client";

import { useRef, useCallback } from "react";

interface UseSilenceDetectionOptions {
  silenceThreshold?: number; // dB level below which is considered silence (default: -50)
  silenceDuration?: number; // milliseconds of silence before triggering (default: 3000)
  onSilenceDetected?: () => void; // Callback when silence is detected
}

interface UseSilenceDetectionReturn {
  analyzeAudioChunk: (audioData: ArrayBuffer) => void;
  reset: () => void;
  isSilent: boolean;
}

export function useSilenceDetection({
  silenceThreshold = -50,
  silenceDuration = 3000,
  onSilenceDetected,
}: UseSilenceDetectionOptions = {}): UseSilenceDetectionReturn {
  const silenceStartTimeRef = useRef<number | null>(null);
  const isSilentRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  const calculateAudioLevel = useCallback((audioData: ArrayBuffer): number => {
    // Convert ArrayBuffer to Int16Array (PCM audio)
    const int16Array = new Int16Array(audioData);
    
    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0;
    for (let i = 0; i < int16Array.length; i++) {
      const normalized = int16Array[i] / 32768; // Normalize to -1 to 1
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / int16Array.length);
    
    // Convert to decibels
    const db = 20 * Math.log10(rms);
    
    return db;
  }, []);

  const analyzeAudioChunk = useCallback((audioData: ArrayBuffer) => {
    const audioLevel = calculateAudioLevel(audioData);
    
    console.log(`🔊 Audio level: ${audioLevel.toFixed(2)} dB`);

    if (audioLevel < silenceThreshold) {
      // Audio is below threshold (silence)
      if (silenceStartTimeRef.current === null) {
        // Start tracking silence
        silenceStartTimeRef.current = Date.now();
        console.log("🤫 Silence started");
      } else {
        // Check if silence duration exceeded
        const silenceDurationMs = Date.now() - silenceStartTimeRef.current;
        
        if (silenceDurationMs >= silenceDuration && !hasTriggeredRef.current) {
          // Silence detected for required duration
          console.log(`✅ Silence detected for ${silenceDuration}ms`);
          isSilentRef.current = true;
          hasTriggeredRef.current = true;
          
          if (onSilenceDetected) {
            onSilenceDetected();
          }
        }
      }
    } else {
      // Audio detected (not silent)
      if (silenceStartTimeRef.current !== null) {
        console.log("🔊 Audio detected, resetting silence timer");
      }
      silenceStartTimeRef.current = null;
      isSilentRef.current = false;
    }
  }, [calculateAudioLevel, silenceThreshold, silenceDuration, onSilenceDetected]);

  const reset = useCallback(() => {
    console.log("🔄 Resetting silence detection");
    silenceStartTimeRef.current = null;
    isSilentRef.current = false;
    hasTriggeredRef.current = false;
  }, []);

  return {
    analyzeAudioChunk,
    reset,
    isSilent: isSilentRef.current,
  };
}
