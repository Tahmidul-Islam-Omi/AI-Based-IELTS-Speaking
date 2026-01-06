// Audio configuration constants
export const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  bitsPerSample: 16,
} as const;

// Audio capture states
export type AudioCaptureState = "idle" | "requesting" | "capturing" | "error";

// Audio playback states
export type AudioPlaybackState = "idle" | "playing" | "error";

// Voice session states
export type VoiceSessionState = 
  | "disconnected" 
  | "connecting" 
  | "connected" 
  | "listening" 
  | "processing" 
  | "speaking" 
  | "error";

// Error types for better error handling
export interface AudioError {
  code: "PERMISSION_DENIED" | "NOT_SUPPORTED" | "DEVICE_ERROR" | "UNKNOWN";
  message: string;
}

// Audio data chunk
export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
}
