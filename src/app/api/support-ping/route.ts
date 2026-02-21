import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportBody = {
  message?: string;
  pageUrl?: string;
  lastQuestion?: string;
};

export async function POST(req: Request) {
  const webhook = process.env.SUPPORT_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { ok: false, error: "Support webhook not configured." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SupportBody>;
  const message = (body.message || "").trim();

  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Support message is required." },
      { status: 400 },
    );
  }

  // Detect Discord vs Slack webhook by URL shape and send the right format.
  // Discord: https://discord.com/api/webhooks/...
  // Slack:   https://hooks.slack.com/...
  const isDiscord = webhook.includes("discord.com/api/webhooks");

  const payload = isDiscord
    ? {
        // Discord format: content + embeds
        content: "🆘 **SpEdGalexii support ping**",
        embeds: [
          {
            color: 0x9b5cfb,
            fields: [
              { name: "Message", value: message, inline: false },
              ...(body.pageUrl
                ? [{ name: "Page", value: body.pageUrl, inline: false }]
                : []),
              ...(body.lastQuestion
                ? [{ name: "Last Galexii Question", value: body.lastQuestion, inline: false }]
                : []),
            ],
          },
        ],
      }
    : {
        // Slack format: text + attachments
        text: "🆘 SpEdGalexii support ping",
        attachments: [
          {
            color: "#9b5cfb",
            fields: [
              { title: "Message", value: message, short: false },
              ...(body.pageUrl
                ? [{ title: "Page", value: body.pageUrl, short: false }]
                : []),
              ...(body.lastQuestion
                ? [{ title: "Last Galexii Question", value: body.lastQuestion, short: false }]
                : []),
            ],
          },
        ],
      };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Webhook failed with ${res.status}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
