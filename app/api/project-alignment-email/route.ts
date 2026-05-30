import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Stage = "1" | "2" | "3" | "4";

type LeadRecord = {
  id: string;
  Email?: string;
  Company?: string;
  Full_Name?: string;
  Lead_Source?: string;
  Lead_Status?: string;
  Inbound_Form_Source?: string;
  Project_Fit_Form_Status?: string;
  Project_Fit_Submitted_Date?: string;
  Project_Fit_Email_Status?: string;
  Project_Fit_Manual_Review?: boolean;
  Project_Fit_Stop_Reason?: string;
};

const ZOHO_API_BASE = process.env.ZOHO_API_BASE || "https://www.zohoapis.in/crm/v7";
const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.in/oauth/v2/token";
const FORM_BASE_URL = process.env.PROJECT_ALIGNMENT_FORM_URL || "https://fit.theimpulsedigital.com";

const STAGES: Record<
  Stage,
  {
    subject: string;
    status: string;
    reminderCount: number;
    expectedPreviousStatus?: string;
    body: (lead: LeadRecord, link: string) => string;
  }
> = {
  "1": {
    subject: "Next step for your enquiry with Impulse Digital",
    status: "Email 01 Sent",
    reminderCount: 0,
    body: (lead, link) => [
      "Hi,",
      "",
      "Thank you for writing to Impulse Digital.",
      "",
      lead.Company
        ? `In order to take this forward, we would like to understand the requirement with a little more precision. It helps us respond with the right direction for ${lead.Company}.`
        : "In order to take this forward, we would like to understand the requirement with a little more precision. It helps us respond with the right direction for your requirement.",
      "",
      "Share the details here:",
      "",
      link,
      "",
      "Once we have this, we will come back with the next step that fits the requirement.",
      "",
      "Regards,",
      "Adwait",
    ].join("\n"),
  },
  "2": {
    subject: "Following up on your enquiry",
    status: "Email 02 Sent",
    reminderCount: 1,
    expectedPreviousStatus: "Email 01 Sent",
    body: (_lead, link) => [
      "Hi,",
      "",
      "Sharing this once again so we can take your inquiry forward with the right context.",
      "",
      "Share the details here:",
      "",
      link,
      "",
      "Once we have this, we will come back with the next step that fits the requirement.",
      "",
      "Regards,",
      "Adwait",
    ].join("\n"),
  },
  "3": {
    subject: "One last check-in",
    status: "Email 03 Sent",
    reminderCount: 2,
    expectedPreviousStatus: "Email 02 Sent",
    body: (_lead, link) => [
      "Hi,",
      "",
      "Just checking in once before we pause this for now.",
      "",
      "If the requirement is still active, please share the details here:",
      "",
      link,
      "",
      "That will help us understand whether this is something we can take forward in the right direction.",
      "",
      "Regards,",
      "Adwait",
    ].join("\n"),
  },
  "4": {
    subject: "Should we revisit this?",
    status: "Email 04 Sent",
    reminderCount: 3,
    expectedPreviousStatus: "Email 03 Sent",
    body: (lead, link) => [
      "Hi,",
      "",
      "Circling back on this once more.",
      "",
      lead.Company
        ? `If this requirement is still active for ${lead.Company}, please share the details here:`
        : "If this requirement is still active, please share the details here:",
      "",
      link,
      "",
      "If priorities have shifted, no worries. We can pick this up whenever the timing is right.",
      "",
      "Regards,",
      "Adwait",
    ].join("\n"),
  },
};

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toZohoDateTime(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.toISOString().slice(0, 19)}+05:30`;
}

function isStage(value: string): value is Stage {
  return ["1", "2", "3", "4"].includes(value);
}

async function getRequestData(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());

  if (request.method === "GET") return query;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return { ...query, ...(body && typeof body === "object" ? body : {}) };
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    if (!formData) return query;
    return { ...query, ...Object.fromEntries(formData.entries()) };
  }

  return query;
}

function assertWebhookSecret(request: Request, data: Record<string, unknown>) {
  const expected = process.env.PROJECT_ALIGNMENT_WEBHOOK_SECRET;
  if (!expected) throw new Error("Project Alignment webhook secret is not configured.");

  const supplied = text(data.secret, 255) || text(request.headers.get("x-project-alignment-secret"), 255);
  if (!supplied || supplied !== expected) throw new Error("Unauthorized webhook request.");
}

async function getAccessToken() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Zoho CRM credentials are not configured on the server.");
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(ZOHO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error("Zoho CRM authentication failed.");
  }

  return data.access_token as string;
}

async function getLead(accessToken: string, leadId: string) {
  const fields = [
    "id",
    "Email",
    "Company",
    "Full_Name",
    "Lead_Source",
    "Lead_Status",
    "Inbound_Form_Source",
    "Project_Fit_Form_Status",
    "Project_Fit_Submitted_Date",
    "Project_Fit_Email_Status",
    "Project_Fit_Manual_Review",
    "Project_Fit_Stop_Reason",
  ].join(",");

  const response = await fetch(`${ZOHO_API_BASE}/Leads/${encodeURIComponent(leadId)}?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Zoho CRM lead lookup failed.");
  const data = await response.json();
  const lead = data?.data?.[0] as LeadRecord | undefined;
  if (!lead?.id) throw new Error("Zoho CRM lead was not found.");
  return lead;
}

function buildProjectAlignmentLink(lead: LeadRecord) {
  const params = new URLSearchParams({
    lead_id: lead.id,
    source: "contact-us",
  });
  if (lead.Email) params.set("email", lead.Email);
  return `${FORM_BASE_URL.replace(/\/$/, "")}/?${params.toString()}`;
}

function getSuppressionReason(lead: LeadRecord, stage: Stage) {
  const source = lead.Inbound_Form_Source || lead.Lead_Source;
  if (source !== "Website Contact Us") return "Lead is not marked as Website Contact Us.";
  if (!lead.Email) return "Lead has no email address.";

  const formStatus = (lead.Project_Fit_Form_Status || "").toLowerCase();
  if (["submitted", "completed", "received"].includes(formStatus) || lead.Project_Fit_Submitted_Date) {
    return "Project Alignment already submitted.";
  }

  if (lead.Project_Fit_Manual_Review) return "Lead is in manual review.";

  const emailStatus = lead.Project_Fit_Email_Status || "";
  if (["Submitted", "Manual Review", "Stopped", "Paused"].includes(emailStatus)) {
    return `Lead email status is ${emailStatus}.`;
  }

  const leadStatus = (lead.Lead_Status || "").toLowerCase();
  if (["converted", "disqualified", "duplicate", "junk lead", "lost lead"].includes(leadStatus)) {
    return `Lead status is ${lead.Lead_Status}.`;
  }

  const expectedPreviousStatus = STAGES[stage].expectedPreviousStatus;
  if (expectedPreviousStatus && emailStatus !== expectedPreviousStatus) {
    return `Expected previous email status ${expectedPreviousStatus}, found ${emailStatus || "blank"}.`;
  }

  if (stage === "1" && emailStatus && emailStatus !== "Not Started") {
    return `Initial email already handled with status ${emailStatus}.`;
  }

  return "";
}

async function sendMail(accessToken: string, lead: LeadRecord, stage: Stage, link: string) {
  const fromEmail = process.env.ZOHO_MAIL_FROM_EMAIL;
  const fromName = process.env.ZOHO_MAIL_FROM_NAME || "Adwait";
  const replyTo = process.env.ZOHO_MAIL_REPLY_TO || fromEmail;
  const useOrgEmail = process.env.ZOHO_MAIL_ORG_EMAIL === "true";

  if (!fromEmail) throw new Error("ZOHO_MAIL_FROM_EMAIL is not configured on the server.");

  const config = STAGES[stage];
  const response = await fetch(`${ZOHO_API_BASE}/Leads/${encodeURIComponent(lead.id)}/actions/send_mail`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          from: { email: fromEmail, user_name: fromName },
          to: [{ email: lead.Email, user_name: lead.Full_Name || lead.Company || "Lead" }],
          reply_to: { email: replyTo, user_name: fromName },
          subject: config.subject,
          content: config.body(lead, link).replace(/\n/g, "<br>"),
          mail_format: "html",
          org_email: useOrgEmail,
        },
      ],
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  const result = data?.data?.[0];
  if (!response.ok || result?.status === "error") {
    const detail = result?.message || result?.code || data?.message || "Zoho CRM rejected the email send request.";
    throw new Error(`Zoho CRM rejected the email send request: ${detail}`);
  }
}

async function updateLeadAfterSend(accessToken: string, lead: LeadRecord, stage: Stage, link: string) {
  const config = STAGES[stage];
  const record: Record<string, unknown> = {
    id: lead.id,
    Project_Fit_Email_Status: config.status,
    Project_Fit_Last_Sent_Date: toZohoDateTime(),
    Project_Fit_Reminder_Count: config.reminderCount,
    Project_Fit_Form_Link: link,
  };

  if (stage === "1") {
    record.Project_Fit_Sequence_Entered_Date = toZohoDateTime();
    record.Inbound_Form_Source = "Website Contact Us";
  }

  if (stage === "4") {
    record.Project_Fit_Stop_Reason = "Project Alignment sequence completed.";
  }

  const response = await fetch(`${ZOHO_API_BASE}/Leads`, {
    method: "PUT",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [record] }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  const result = data?.data?.[0];
  if (!response.ok || result?.status !== "success") {
    throw new Error(result?.message || "Zoho CRM rejected the post-email lead update.");
  }
}

async function handleWebhook(request: Request) {
  const data = await getRequestData(request);
  assertWebhookSecret(request, data);

  const stage = text(data.stage, 1);
  if (!isStage(stage)) throw new Error("Invalid Project Alignment email stage.");

  const leadId = text(data.lead_id || data.id || data.Lead_ID || data.record_id, 32);
  if (!leadId) throw new Error("Missing Zoho lead ID.");

  const accessToken = await getAccessToken();
  const lead = await getLead(accessToken, leadId);
  const suppressionReason = getSuppressionReason(lead, stage);

  if (suppressionReason) {
    return NextResponse.json({ success: true, sent: false, suppressed: true, reason: suppressionReason });
  }

  const link = buildProjectAlignmentLink(lead);
  await sendMail(accessToken, lead, stage, link);
  await updateLeadAfterSend(accessToken, lead, stage, link);

  return NextResponse.json({ success: true, sent: true, stage });
}

export async function GET(request: Request) {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    return await handleWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project Alignment email automation failed.";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Missing") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
