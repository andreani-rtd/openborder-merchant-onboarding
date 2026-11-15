// Emails a merchant's onboarding submission to Operations from the onboarding bot account.
// Operations receiving it triggers the Ops onboarding bot; intake-prefill.json fills the TAM/CSM intake form.
import nodemailer from "nodemailer";

// The sender is the account in BOT_SMTP_USER, so no address is hard-coded here.
const FROM = () => process.env.ONBOARDING_FROM || `OpenBorder Onboarding Bot <${process.env.BOT_SMTP_USER}>`;
const TO = process.env.ONBOARDING_TO || "operations@openborder.com";
const MAX_BYTES = 750_000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return json(413, { error: "Submission too large" });

  let data;
  try { data = JSON.parse(raw); } catch { return json(400, { error: "Invalid submission" }); }
  const { subject, body, payload, accessCode, website2 } = data || {};

  // Honeypot: real visitors never fill this hidden field.
  if (website2) return json(200, { ok: true });

  // Optional invite code: set ONBOARDING_ACCESS_CODE and share links like https://your-site/?code=XXXX
  const required = process.env.ONBOARDING_ACCESS_CODE;
  if (required && accessCode !== required) return json(403, { error: "This onboarding link isn’t valid. Ask your OpenBorder contact for a new one." });

  if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim() || !payload || typeof payload !== "object")
    return json(400, { error: "Missing details" });
  const company = payload?.intake_prefill?.customer_name;
  if (!company) return json(400, { error: "Company name is missing" });

  const user = process.env.BOT_SMTP_USER;
  const pass = process.env.BOT_SMTP_PASSWORD;
  if (!user || !pass) return json(500, { error: "Sending isn’t set up yet" });

  // Reply-To: the merchant's signer, or the first contact with an email.
  const contacts = Array.isArray(payload.merchant_contacts) ? payload.merchant_contacts : [];
  const replyTo = [payload?.intake_prefill?.signer_email, ...contacts.map((c) => c && c.email)].find((e) => typeof e === "string" && EMAIL_RE.test(e));

  const transport = nodemailer.createTransport({
    host: process.env.BOT_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.BOT_SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from: FROM(),
      to: TO,
      ...(replyTo ? { replyTo } : {}),
      subject: subject.slice(0, 250),
      text: body,
      attachments: [
        { filename: "onboarding.json", content: JSON.stringify(payload, null, 2), contentType: "application/json" },
        { filename: "intake-prefill.json", content: JSON.stringify(payload.intake_prefill || {}, null, 2), contentType: "application/json" },
      ],
    });
    return json(200, { ok: true });
  } catch (err) {
    console.error("Onboarding email failed:", err);
    return json(502, { error: "The email didn’t send" });
  }
};
