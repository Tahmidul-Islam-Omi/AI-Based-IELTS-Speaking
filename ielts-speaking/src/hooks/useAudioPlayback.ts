"use client";

import { useState, useRef, useCallback } from "react";
import { AUDIO_CONFIG, AudioPlaybackState } from "@/types";

interface UseAudioPlaybackReturn {
  state: AudioPlaybackState;
  isPlaying: boolean;
  playAudio: (pcmData: ArrayBuffer) => Promise<void>;
  stopPlayback: () => void;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [state, setState] = useState<AudioPlaybackState>("idle");

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({
        sampleRate: AUDIO_CONFIG.sampleRate,
      });
    }
    return audioContextRef.current;
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setState("idle");
      return;
    }

    isPlayingRef.current = true;
    setState("playing");

    const pcmData = audioQueueRef.current.shift()!;
    const audioContext = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Convert Int16 PCM to Float32
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(
      AUDIO_CONFIG.channelCount,
      float32Array.length,
      AUDIO_CONFIG.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    // Create and play source node
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNodeRef.current = sourceNode;

    sourceNode.onended = () => {
      playNextInQueue();
    };

    sourceNode.start();
  }, [getAudioContext]);

  const playAudio = useCallback(async (pcmData: ArrayBuffer) => {
    audioQueueRef.current.push(pcmData);

    if (!isPlayingRef.current) {
      await playNextInQueue();
    }
  }, [playNextInQueue]);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      sourceNodeRef.current = null;
    }

    isPlayingRef.current = false;
    setState("idle");
  }, []);

  return {
    state,
    isPlaying: isPlayingRef.current,
    playAudio,
    stopPlayback,
  };
}
