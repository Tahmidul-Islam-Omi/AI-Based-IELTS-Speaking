"use client";

import { useState, useRef, useCallback } from "react";
import { AUDIO_CONFIG, AudioCaptureState, AudioError } from "@/types";

interface UseAudioCaptureReturn {
  state: AudioCaptureState;
  error: AudioError | null;
  startCapture: (onAudioData: (data: ArrayBuffer) => void) => Promise<void>;
  stopCapture: () => void;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [state, setState] = useState<AudioCaptureState>("idle");
  const [error, setError] = useState<AudioError | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const onAudioDataRef = useRef<((data: ArrayBuffer) => void) | null>(null);

  const stopCapture = useCallback(() => {
    console.log("⏹️ Stopping audio capture...");

    // Disconnect source node
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    // Disconnect worklet
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      console.log("🛑 Microphone stopped");
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
      console.log("🔌 AudioContext closed");
    }

    onAudioDataRef.current = null;
    setState("idle");
    console.log("✅ Recording stopped");
  }, []);

  const startCapture = useCallback(
    async (onAudioData: (data: ArrayBuffer) => void) => {
      try {
        // Clean up any existing capture first
        stopCapture();
        
        setState("requesting");
        setError(null);
        onAudioDataRef.current = onAudioData;
        console.log("🎙️ Starting audio capture...");

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw { code: "NOT_SUPPORTED", message: "Browser does not support audio capture" };
        }

        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: AUDIO_CONFIG.sampleRate,
            channelCount: AUDIO_CONFIG.channelCount,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        console.log("✅ Microphone permission granted");
        mediaStreamRef.current = stream;

        // Create AudioContext
        const audioContext = new AudioContext({
          sampleRate: AUDIO_CONFIG.sampleRate,
        });
        console.log(`📊 AudioContext created (Sample Rate: ${AUDIO_CONFIG.sampleRate} Hz)`);
        audioContextRef.current = audioContext;

        // Load audio worklet for processing
        try {
          await audioContext.audioWorklet.addModule("/audio-processor.js");
          console.log("⚙️ AudioWorklet loaded");
        } catch (workletError) {
          console.error("❌ Failed to load AudioWorklet:", workletError);
          throw { code: "UNKNOWN", message: "Failed to load audio processor" };
        }

        // Create source and worklet node
        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        
        const workletNode = new AudioWorkletNode(audioContext, "audio-processor");
        workletNodeRef.current = workletNode;
        console.log("🔗 Audio nodes connected");

        // Handle audio data from worklet
        workletNode.port.onmessage = (event) => {
          if (onAudioDataRef.current && event.data.audioData) {
            const audioData = event.data.audioData;
            onAudioDataRef.current(audioData);
          }
        };

        // Connect nodes
        source.connect(workletNode);
        // Don't connect to destination to avoid feedback
        // workletNode.connect(audioContext.destination);

        setState("capturing");
        console.log("🔴 Recording started - speak now!");
      } catch (err) {
        const audioError = parseError(err);
        setError(audioError);
        setState("error");
        console.error("❌ Audio capture error:", audioError);
        stopCapture();
      }
    },
    [stopCapture]
  );

  return { state, error, startCapture, stopCapture };
}

function parseError(err: unknown): AudioError {
  if (err && typeof err === "object" && "code" in err) {
    return err as AudioError;
  }

  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return { code: "PERMISSION_DENIED", message: "Microphone permission denied" };
    }
    if (err.name === "NotFoundError") {
      return { code: "DEVICE_ERROR", message: "No microphone found" };
    }
  }

  return { code: "UNKNOWN", message: "Failed to capture audio" };
}
