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

  const result = await response.json();
  console.log(`✅ Backend acknowledged: ${result.bytesReceived} bytes`);
}
