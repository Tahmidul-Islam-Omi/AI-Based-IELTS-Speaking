import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio } = body;

    if (!audio) {
      return NextResponse.json(
        { error: "No audio data received" },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(audio, "base64");

    // TODO: Forward to Google Multimodal Live API
    console.log(`🎤 Audio received: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

    return NextResponse.json({
      success: true,
      message: "Audio received",
      bytesReceived: audioBuffer.length,
    });
  } catch (error) {
    console.error("❌ Error processing audio:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
