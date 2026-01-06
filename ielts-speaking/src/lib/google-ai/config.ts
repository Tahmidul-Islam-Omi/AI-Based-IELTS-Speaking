export const GOOGLE_AI_CONFIG = {
  model: "gemini-2.0-flash-exp",
  apiVersion: "v1alpha",
  websocketBaseUrl: "wss://generativelanguage.googleapis.com",
  
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    channels: 1,
  },
  
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Aoede",
        },
      },
    },
  },
} as const;

export function getWebSocketUrl(apiKey: string): string {
  return `${GOOGLE_AI_CONFIG.websocketBaseUrl}/${GOOGLE_AI_CONFIG.apiVersion}/models/${GOOGLE_AI_CONFIG.model}:streamGenerateContent?key=${apiKey}`;
}
