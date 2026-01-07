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
    
    let audioChunks = [];
    let geminiSession = null;

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "start") {
          audioChunks = [];
          console.log("🎙️ Recording started");
          ws.send(JSON.stringify({ type: "status", status: "recording" }));
        }

        if (data.type === "audio") {
          const audioBuffer = Buffer.from(data.audio, "base64");
          audioChunks.push(audioBuffer);
        }

        if (data.type === "stop") {
          console.log(`📤 Sending ${audioChunks.length} chunks to Gemini...`);
          ws.send(JSON.stringify({ type: "status", status: "processing" }));

          const combinedAudio = Buffer.concat(audioChunks);
          const base64Audio = combinedAudio.toString("base64");

          // Connect to Gemini and stream responses
          try {
            geminiSession = await ai.live.connect({
              model: "gemini-2.0-flash-exp",
              config: {
                responseModalities: [Modality.AUDIO],
              },
              callbacks: {
                onopen: () => {
                  console.log("🔗 Connected to Gemini");
                },
                onmessage: (msg) => {
                  if (msg.serverContent?.modelTurn?.parts) {
                    for (const part of msg.serverContent.modelTurn.parts) {
                      if (part.inlineData?.data) {
                        // Stream chunk immediately to frontend
                        ws.send(JSON.stringify({
                          type: "audio_chunk",
                          audio: part.inlineData.data,
                        }));
                        console.log("🔊 Streamed audio chunk to frontend");
                      }
                    }
                  }

                  if (msg.serverContent?.turnComplete) {
                    console.log("✅ Gemini turn complete");
                    ws.send(JSON.stringify({ type: "status", status: "done" }));
                    if (geminiSession) {
                      geminiSession.close();
                      geminiSession = null;
                    }
                  }
                },
                onerror: (e) => {
                  console.error("❌ Gemini error:", e);
                  ws.send(JSON.stringify({ type: "error", message: "Gemini error" }));
                },
                onclose: () => {
                  console.log("🔌 Gemini connection closed");
                },
              },
            });

            // Send audio to Gemini
            geminiSession.sendRealtimeInput({
              audio: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });

            // Signal end of audio
            setTimeout(() => {
              if (geminiSession) {
                geminiSession.sendRealtimeInput({ audioStreamEnd: true });
              }
            }, 500);

          } catch (err) {
            console.error("❌ Failed to connect to Gemini:", err);
            ws.send(JSON.stringify({ type: "error", message: "Failed to connect to Gemini" }));
          }

          audioChunks = [];
        }
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    });

    ws.on("close", () => {
      console.log("🔌 Client disconnected");
      if (geminiSession) {
        geminiSession.close();
        geminiSession = null;
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket on ws://localhost:${PORT}/ws`);
  });
});
