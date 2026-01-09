const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");
const { GoogleGenAI, Modality } = require("@google/genai");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Load env
require("dotenv").config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("🔗 Client connected");
    
    let geminiSession = null;
    let isRecording = false;
    let geminiConnected = false;
    let isProcessing = false; // Track if Gemini is still processing

    // Safe send - only send if WebSocket is open
    const safeSend = (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
      }
      console.log("⚠️ WebSocket not open, skipping send");
      return false;
    };

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "start") {
          console.log("🎙️ Recording started - connecting to Gemini...");
          isRecording = true;
          isProcessing = false;
          safeSend({ type: "status", status: "recording" });

          // Connect to Gemini immediately (don't wait for audio)
          try {
            geminiSession = await ai.live.connect({
              model: "gemini-2.0-flash-exp",
              config: {
                responseModalities: [Modality.AUDIO],
              },
              callbacks: {
                onopen: () => {
                  console.log("� Connectted to Gemini - ready to stream audio");
                  geminiConnected = true;
                },
                onmessage: (msg) => {
                  if (msg.serverContent?.modelTurn?.parts) {
                    for (const part of msg.serverContent.modelTurn.parts) {
                      if (part.inlineData?.data) {
                        // Stream response chunk immediately to frontend
                        if (safeSend({ type: "audio_chunk", audio: part.inlineData.data })) {
                          console.log("🔊 Streamed response chunk to frontend");
                        }
                      }
                    }
                  }

                  if (msg.serverContent?.turnComplete) {
                    console.log("✅ Gemini turn complete");
                    isProcessing = false;
                    safeSend({ type: "status", status: "done" });
                    
                    // Close Gemini session
                    if (geminiSession) {
                      geminiSession.close();
                      geminiSession = null;
                      geminiConnected = false;
                    }
                  }
                },
                onerror: (e) => {
                  console.error("❌ Gemini error:", e);
                  isProcessing = false;
                  safeSend({ type: "error", message: "Gemini error" });
                  geminiConnected = false;
                },
                onclose: () => {
                  console.log("🔌 Gemini connection closed");
                  geminiConnected = false;
                  isProcessing = false;
                },
              },
            });
          } catch (err) {
            console.error("❌ Failed to connect to Gemini:", err);
            safeSend({ type: "error", message: "Failed to connect to Gemini" });
            isRecording = false;
            isProcessing = false;
          }
        }

        if (data.type === "audio") {
          // Stream audio chunk to Gemini immediately (don't wait for all chunks)
          if (geminiConnected && geminiSession && isRecording) {
            try {
              geminiSession.sendRealtimeInput({
                audio: {
                  data: data.audio,
                  mimeType: "audio/pcm;rate=16000",
                },
              });
            } catch (err) {
              console.error("❌ Error sending audio to Gemini:", err);
            }
          }
        }

        if (data.type === "stop") {
          console.log("⏹️ Recording stopped - signaling end of audio to Gemini");
          isRecording = false;
          isProcessing = true; // Gemini is now processing
          safeSend({ type: "status", status: "processing" });

          // Signal end of audio stream to Gemini
          if (geminiConnected && geminiSession) {
            try {
              geminiSession.sendRealtimeInput({ audioStreamEnd: true });
              console.log("📤 Signaled end of audio stream to Gemini");
            } catch (err) {
              console.error("❌ Error signaling end of audio:", err);
              isProcessing = false;
            }
          }
        }
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    });

    ws.on("close", () => {
      console.log("🔌 Client disconnected");
      
      // Only close Gemini if not processing
      // If processing, let it finish (response will be lost but prevents errors)
      if (!isProcessing && geminiSession) {
        try {
          geminiSession.close();
        } catch {}
        geminiSession = null;
        geminiConnected = false;
      } else if (isProcessing) {
        console.log("⚠️ Client disconnected while Gemini was processing - response will be lost");
      }
      
      isRecording = false;
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket error:", err);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket on ws://localhost:${PORT}/ws`);
  });
});
