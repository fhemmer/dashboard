import { Resend } from "resend";

import { getServerEnv } from "./env";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (_resend === null) {
    const apiKey = getServerEnv().RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = getResend();
  const { to, subject, html, from = "Dashboard <noreply@updates.hemmer.us>" } = options;

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(error.message);
  }

  return data;
}
