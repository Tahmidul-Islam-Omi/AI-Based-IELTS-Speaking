"use client";

import { useRef, useCallback, useState } from "react";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/lib/api";

type Status = "idle" | "connecting" | "recording" | "processing" | "speaking" | "error";

interface UseWebSocketReturn {
  status: Status;
  connect: () => void;
  disconnect: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  sendAudioChunk: (audioData: ArrayBuffer) => void;
  onAudioChunk: (callback: (audioData: ArrayBuffer) => void) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<Status>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const audioCallbackRef = useRef<((audioData: ArrayBuffer) => void) | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
      console.log("🔗 WebSocket connected");
      setStatus("idle");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "status") {
        console.log(`📊 Status: ${data.status}`);
        if (data.status === "recording") setStatus("recording");
        if (data.status === "processing") setStatus("processing");
        if (data.status === "done") setStatus("idle");
      }

      if (data.type === "audio_chunk") {
        console.log("🔊 Received audio chunk");
        setStatus("speaking");
        if (audioCallbackRef.current) {
          const audioBuffer = base64ToArrayBuffer(data.audio);
          audioCallbackRef.current(audioBuffer);
        }
      }

      if (data.type === "error") {
        console.error("❌ Server error:", data.message);
        setStatus("error");
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setStatus("error");
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      setStatus("idle");
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("idle");
  }, []);

  const startRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "start" }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }
  }, []);

  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const base64Audio = arrayBufferToBase64(audioData);
      wsRef.current.send(JSON.stringify({ type: "audio", audio: base64Audio }));
    }
  }, []);

  const onAudioChunk = useCallback((callback: (audioData: ArrayBuffer) => void) => {
    audioCallbackRef.current = callback;
  }, []);

  return {
    status,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendAudioChunk,
    onAudioChunk,
  };
}
