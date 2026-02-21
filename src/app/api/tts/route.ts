import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/tts
 *
 * Converts text to speech using ElevenLabs.
 * Returns audio/mpeg binary for direct playback.
 *
 * Body: { text: string, voiceId?: string }
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured. Add ELEVENLABS_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  let text: string;
  let voiceId: string;

  try {
    const body = await req.json();
    text = String(body.text || "").trim().slice(0, 5000); // ElevenLabs limit
    voiceId =
      body.voiceId ||
      process.env.ELEVENLABS_VOICE_ID ||
      "21m00Tcm4TlvDq8ikWAM"; // Rachel (default Galexii voice)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      model_id: "eleven_turbo_v2_5", // fastest + cheapest model
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.1,
        use_speaker_boost: true,
      },
    });

    // Collect stream into a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TTS] ElevenLabs error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts
 * Returns TTS configuration status and available voices info.
 */
export async function GET() {
  const configured = Boolean(process.env.ELEVENLABS_API_KEY);
  return NextResponse.json({
    configured,
    voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    voiceName: "Rachel (default)",
    model: "eleven_turbo_v2_5",
    maxChars: 5000,
    voiceLibrary: "https://elevenlabs.io/voice-library",
  });
}
