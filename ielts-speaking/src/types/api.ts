// API message types for communication between client and server

export interface ClientMessage {
  type: "audio" | "start" | "stop";
  data?: string; // Base64 encoded audio for "audio" type
}

export interface ServerMessage {
  type: "audio" | "status" | "error";
  data?: string; // Base64 encoded audio for "audio" type
  status?: "ready" | "processing" | "speaking" | "done";
  error?: string;
}

// Google Multimodal Live API configuration
export interface LiveAPIConfig {
  model: string;
  generationConfig?: {
    responseModalities?: string[];
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: {
          voiceName?: string;
        };
      };
    };
  };
}
