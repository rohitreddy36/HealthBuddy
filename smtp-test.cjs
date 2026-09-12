#!/usr/bin/env node
/**
 * Standalone SMTP connectivity + send test for HealthBuddy.
 *
 * Doesn't touch your app code or any server routes -- just points nodemailer
 * at the same SMTP_* values from your .env and tries to (1) authenticate and
 * (2) send one real test email. Nothing here reads or prints your password.
 *
 * Usage (run from the HealthBuddy project root):
 *   node smtp-test.cjs .env adityakumarnhce@gmail.com
 */
const nodemailer = require("nodemailer");
const { readFileSync } = require("fs");

const envPath = process.argv[2] || ".env";
const to = process.argv[3];

if (!to) {
  console.error("Usage: node smtp-test.cjs [path-to-.env] <recipient-email>");
  process.exit(1);
}

const envText = readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const host = env.SMTP_HOST || "smtp.gmail.com";
const port = Number(env.SMTP_PORT || 465);
const user = env.SMTP_USER;
const pass = env.SMTP_PASS;
const fromName = env.SMTP_FROM_NAME || "AIL Health";

async function main() {
  if (!user || !pass) {
    console.error(`Missing SMTP_USER/SMTP_PASS in ${envPath}`);
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log(`OK: SMTP connection + auth verified against ${host}:${port}`);
  } catch (e) {
    console.error("FAIL: SMTP verify failed:", e && e.message ? e.message : e);
    console.error("  Common causes: wrong SMTP_USER, using your normal Gmail password instead of an App Password,");
    console.error("  or 2-Step Verification not enabled on the Google account.");
    process.exit(1);
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject: "HealthBuddy SMTP test",
      text: "This is a test email confirming your local HealthBuddy SMTP setup is working.",
      html: "<p>This is a test email confirming your local <b>HealthBuddy</b> SMTP setup is working.</p>",
    });
    console.log(`OK: Sent to ${to}. messageId: ${info.messageId}`);
  } catch (e) {
    console.error("FAIL: Send failed:", e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
