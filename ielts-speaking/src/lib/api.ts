// Convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Send audio chunk to backend
export async function sendAudioToBackend(audioData: ArrayBuffer): Promise<void> {
  const base64Audio = arrayBufferToBase64(audioData);

  const response = await fetch("/api/voice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send audio: ${response.statusText}`);
  }
}

// Signal backend to start recording
export async function startSession(): Promise<void> {
  await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start" }),
  });
  console.log("🎙️ Session started");
}

// Signal backend to stop and get AI response
export async function stopSessionAndGetResponse(): Promise<string | null> {
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "stop" }),
  });

  const result = await response.json();

  if (result.success && result.audio) {
    console.log("📥 Received AI response audio");
    return result.audio; // Base64 encoded audio
  }

  console.error("❌ No audio response:", result.error);
  return null;
}

// Convert Base64 to ArrayBuffer for playback
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
