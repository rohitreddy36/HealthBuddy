import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "Missing SMTP_USER / SMTP_PASS environment variables. See README.md for Gmail SMTP setup.",
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
  });
  return transporter;
}

export type ReminderContent = {
  toEmail: string;
  toName?: string | null;
  generatedAt: string; // ISO timestamp of the symptom check this reminder is based on
  summary?: string;
  avoid: string[];
  selfCare: string[];
  whenToSeekCare?: string;
  careReason?: string;
};

// The stored `result` column on symptom_analyses is JSONB (typed as `Json`
// at the DB layer), so pull the fields we need defensively rather than
// assuming the exact analysisSchema shape from health.functions.ts.
export function buildReminderContent(
  result: unknown,
  generatedAt: string,
  toEmail: string,
  toName?: string | null,
): ReminderContent {
  const r = (result ?? {}) as Record<string, unknown>;
  const diet = (r.diet ?? {}) as Record<string, unknown>;
  return {
    toEmail,
    toName,
    generatedAt,
    summary: typeof r.summary === "string" ? r.summary : undefined,
    avoid: Array.isArray(diet.avoid) ? (diet.avoid as string[]) : [],
    selfCare: Array.isArray(r.self_care) ? (r.self_care as string[]) : [],
    whenToSeekCare: typeof r.when_to_seek_care === "string" ? r.when_to_seek_care : undefined,
    careReason: typeof r.care_reason === "string" ? r.care_reason : undefined,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urgencyLabel(v?: string) {
  switch (v) {
    case "seek_urgent_care":
      return { label: "Seek urgent care", color: "#b45309", bg: "#fef3c7" };
    case "book_appointment_soon":
      return { label: "Book an appointment soon", color: "#9a3412", bg: "#ffedd5" };
    default:
      return { label: "Monitor at home", color: "#166534", bg: "#dcfce7" };
  }
}

function listRows(items: string[], bulletColor: string) {
  if (items.length === 0) return "";
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:4px 0 4px 0;vertical-align:top;width:20px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${bulletColor};margin-top:7px;"></span>
          </td>
          <td style="padding:4px 0 4px 8px;font-size:14px;line-height:1.5;color:#334155;">${escapeHtml(item)}</td>
        </tr>`,
    )
    .join("");
}

export function renderReminderEmailHtml(content: ReminderContent) {
  const dateLabel = new Date(content.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const urgency = urgencyLabel(content.whenToSeekCare);
  const greetingName = content.toName?.split(" ")[0];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your daily health reminder</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#2f6fb0,#3fae7f);padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:36px;height:36px;background:rgba(255,255,255,0.18);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">&#128147;</td>
                    <td style="padding-left:10px;color:#ffffff;font-size:18px;font-weight:600;">HealthBuddy</td>
                  </tr>
                </table>
                <div style="color:rgba(255,255,255,0.92);font-size:13px;margin-top:10px;">Your daily reminder</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font-size:15px;color:#0f172a;">
                  Hi${greetingName ? ` ${escapeHtml(greetingName)}` : ""},
                </p>
                <p style="margin:0;font-size:13px;color:#64748b;">
                  Based on your symptom check from <strong>${dateLabel}</strong>, here's what to keep in mind today.
                </p>
              </td>
            </tr>

            ${content.summary
      ? `<tr><td style="padding:16px 32px 0 32px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;background:#f8fafc;border-radius:12px;padding:14px 16px;">${escapeHtml(content.summary)}</p>
                  </td></tr>`
      : ""
    }

            ${content.avoid.length > 0
      ? `<tr><td style="padding:20px 32px 0 32px;">
                    <div style="font-size:13px;font-weight:600;color:#b45309;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
                      &#9888;&nbsp; Avoid these today
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listRows(content.avoid, "#f59e0b")}</table>
                  </td></tr>`
      : ""
    }

            ${content.selfCare.length > 0
      ? `<tr><td style="padding:20px 32px 0 32px;">
                    <div style="font-size:13px;font-weight:600;color:#2f6fb0;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
                      &#10003;&nbsp; Keep doing
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listRows(content.selfCare, "#2f6fb0")}</table>
                  </td></tr>`
      : ""
    }

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${urgency.bg};border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:13px;font-weight:700;color:${urgency.color};">${urgency.label}</div>
                      ${content.careReason ? `<div style="font-size:12.5px;color:${urgency.color};margin-top:4px;opacity:0.9;">${escapeHtml(content.careReason)}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 28px 32px;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
                  AIL Health Advisor provides general wellness guidance only and is not a substitute for
                  professional medical care. This is an automated daily reminder based on your most recent
                  symptom check &mdash; you can turn it off any time from your account.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderReminderEmailText(content: ReminderContent) {
  const lines = [
    `Your daily health reminder (based on your check on ${new Date(content.generatedAt).toLocaleString()})`,
    "",
  ];
  if (content.summary) lines.push(content.summary, "");
  if (content.avoid.length) lines.push("Avoid today:", ...content.avoid.map((a) => `- ${a}`), "");
  if (content.selfCare.length) lines.push("Keep doing:", ...content.selfCare.map((a) => `- ${a}`), "");
  lines.push(
    "This is general wellness guidance only, not a substitute for professional medical care.",
  );
  return lines.join("\n");
}

export async function sendReminderEmail(content: ReminderContent) {
  const fromName = process.env.SMTP_FROM_NAME || "AIL Health";
  const fromAddress = process.env.SMTP_USER;
  await getTransport().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: content.toEmail,
    subject: "Your daily health reminder \u2014 things to keep in mind today",
    html: renderReminderEmailHtml(content),
    text: renderReminderEmailText(content),
  });
}
