import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

// Store audio chunks for the session
const audioChunks: Buffer[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, action } = body;

    // Start recording - clear previous chunks
    if (action === "start") {
      audioChunks.length = 0;
      console.log("🎙️ Session started - collecting audio");
      return NextResponse.json({ success: true });
    }

    // Stop recording - send to Gemini and get response
    if (action === "stop") {
      if (audioChunks.length === 0) {
        return NextResponse.json({ error: "No audio recorded" }, { status: 400 });
      }

      console.log(`📤 Sending ${audioChunks.length} chunks to Gemini...`);

      // Combine all audio chunks
      const combinedAudio = Buffer.concat(audioChunks);
      const base64Audio = combinedAudio.toString("base64");

      // Send to Gemini Live API
      const responseAudio = await sendToGemini(base64Audio);

      audioChunks.length = 0;

      if (responseAudio) {
        console.log(`📥 Received response: ${(responseAudio.length / 1024).toFixed(2)} KB`);
        return NextResponse.json({
          success: true,
          audio: responseAudio,
        });
      }

      return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
    }

    // Collect audio chunk
    if (audio) {
      const audioBuffer = Buffer.from(audio, "base64");
      audioChunks.push(audioBuffer);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function sendToGemini(base64Audio: string): Promise<string | null> {
  return new Promise(async (resolve) => {
    const audioChunksResponse: string[] = [];
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log("⏱️ Timeout - returning collected audio");
        resolve(audioChunksResponse.length > 0 ? audioChunksResponse.join("") : null);
      }
    }, 30000);

    try {
      const session = await ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            console.log("🔗 Connected to Gemini");
          },
          onmessage: (message: any) => {
            console.log("📨 Message received:", JSON.stringify(message).substring(0, 200));
            
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  audioChunksResponse.push(part.inlineData.data);
                  console.log(`🔊 Audio chunk received (${audioChunksResponse.length})`);
                }
              }
            }
            
            if (message.serverContent?.turnComplete) {
              console.log("✅ Turn complete");
              clearTimeout(timeout);
              if (!resolved) {
                resolved = true;
                session.close();
                resolve(audioChunksResponse.join(""));
              }
            }
          },
          onerror: (e: any) => {
            console.error("❌ Gemini error:", e);
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          },
          onclose: (e: any) => {
            console.log("🔌 Connection closed:", e?.reason || "unknown");
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              resolve(audioChunksResponse.length > 0 ? audioChunksResponse.join("") : null);
            }
          },
        },
      });

      // Send the audio after connection is established
      console.log("📤 Sending audio to Gemini...");
      session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });

      // Signal end of audio stream
      setTimeout(() => {
        console.log("📤 Signaling end of audio input");
        session.sendRealtimeInput({ audioStreamEnd: true });
      }, 1000);

    } catch (err) {
      console.error("❌ Failed to connect:", err);
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }
  });
}
