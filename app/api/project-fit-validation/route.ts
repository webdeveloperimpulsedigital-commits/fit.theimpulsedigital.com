import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Payload = {
  url?: unknown;
  lead_id?: unknown;
  email?: unknown;
  source?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  fullName?: unknown;
  companyName?: unknown;
  designation?: unknown;
  workEmail?: unknown;
  phoneNumber?: unknown;
  website?: unknown;
  businessOutcomes?: unknown;
  triggerReasonNow?: unknown;
  month6SuccessDefinition?: unknown;
  currentStage?: unknown;
  servicesConsidered?: unknown;
  expectedInvestmentRange?: unknown;
  startTimeline?: unknown;
  decisionInvolvement?: unknown;
  pastExperience?: unknown;
  pastExperienceNotes?: unknown;
  relevantLinks?: unknown;
};

const ZOHO_API_BASE = process.env.ZOHO_API_BASE || "https://www.zohoapis.in/crm/v7";
const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.in/oauth/v2/token";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

const businessOutcomes = [
  "Generate more qualified leads",
  "Improve brand visibility or credibility",
  "Build or improve our website",
  "Improve search visibility",
  "Strengthen social media presence",
  "Launch a campaign",
  "Improve employer brand or talent attraction",
  "Use AI to improve speed, scale, or efficiency",
  "We are not sure yet and need strategic guidance",
];

const currentStages = [
  "We know the exact service we need",
  "We know the business problem, but need help deciding the right solution",
  "We have tried something earlier and want to improve it",
  "We are comparing agencies or partners",
  "We are only exploring possibilities right now",
];

const services = [
  "SEO or search-led growth",
  "Social media strategy and management",
  "Performance marketing",
  "Website or landing page development",
  "Content strategy",
  "Video or campaign production",
  "Employer branding",
  "Analytics or reporting systems",
  "AI-led marketing or operational solutions",
  "We want Impulse Digital to recommend the right mix",
];

const investmentRanges = [
  "Under ₹1 lakh total",
  "₹1 lakh to ₹3 lakh total",
  "₹3 lakh to ₹7 lakh total",
  "₹7 lakh to ₹15 lakh total",
  "₹15 lakh to ₹30 lakh total",
  "₹30 lakh plus total",
  "Monthly retainer: under ₹1 lakh per month",
  "Monthly retainer: ₹1 lakh to ₹2.5 lakh per month",
  "Monthly retainer: ₹2.5 lakh to ₹5 lakh per month",
  "Monthly retainer: ₹5 lakh plus per month",
  "Budget is not finalised, but we are open to recommendations",
];

const timelines = [
  "Immediately",
  "Within 2 to 4 weeks",
  "Within 1 to 2 months",
  "In the next quarter",
  "No fixed timeline yet",
];

const decisionInvolvement = [
  "Founder or business owner",
  "CEO, MD, or CXO",
  "Marketing head",
  "HR or employer branding head",
  "Sales or business head",
  "Procurement or finance",
  "I am the final decision-maker",
  "I am gathering information for someone else",
];

const pastExperiences = [
  "Yes, with an agency",
  "Yes, with a freelancer",
  "Yes, with an internal team",
  "No, this is our first serious attempt",
  "We are currently working with someone, but evaluating alternatives",
];

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
}

function assertHoneypotIsEmpty(body: Payload) {
  if (text(body.url, 255)) {
    throw new Error("Unable to submit this form.");
  }
}

function assertWithinRateLimit(request: Request, body: Payload) {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const leadContext =
    text(body.lead_id, 32) ||
    text(body.email, 100).toLowerCase() ||
    text(body.workEmail, 100).toLowerCase() ||
    "anonymous";
  const key = `${clientIp}:${leadContext}`;

  for (const [bucketKey, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) rateLimitStore.delete(bucketKey);
  }

  const bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_ATTEMPTS) {
    throw new Error("Too many submission attempts. Please wait a few minutes and try again.");
  }
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const clean = text(value, maxLength);
  if (!clean) throw new Error(`${label} is required.`);
  return clean;
}

function rejectJunkText(value: string, label: string, minLength = 2) {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < minLength) throw new Error(`${label} is too short.`);
  if (/^(.)\1{4,}$/i.test(compact)) throw new Error(`${label} does not look valid.`);
  if (/https?:\/\//i.test(value) && label !== "Relevant links") throw new Error(`${label} does not look valid.`);
  return value;
}

function validateFullName(value: string) {
  const clean = rejectJunkText(value, "Full name", 2);
  if (!/^[A-Za-z][-A-Za-z .']{1,79}$/.test(clean)) {
    throw new Error("Full name should use letters only, with spaces, apostrophes, hyphens, or full stops if needed.");
  }
  if (/\d/.test(clean)) throw new Error("Full name should not contain numbers.");
  return clean;
}

function validateSimpleText(value: string, label: string, minLength = 2) {
  const clean = rejectJunkText(value, label, minLength);
  const letters = clean.match(/[A-Za-z]/g)?.length || 0;
  if (letters < 2) throw new Error(`${label} does not look valid.`);
  return clean;
}

function option(value: unknown, allowed: string[], label: string) {
  const clean = requiredText(value, label, 255);
  if (!allowed.includes(clean)) throw new Error(`${label} has an invalid value.`);
  return clean;
}

function optionList(value: unknown, allowed: string[], label: string) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} is required.`);
  const clean = value.map((item) => text(item, 255)).filter(Boolean);
  if (clean.length === 0 || clean.some((item) => !allowed.includes(item))) {
    throw new Error(`${label} has an invalid value.`);
  }
  return clean;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value);
}

function validatePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Phone number should contain 10 to 15 digits.");
  }
  if (!/^\+?[0-9][0-9\s().-]{9,29}$/.test(value)) {
    throw new Error("Phone number does not look valid.");
  }
  return value;
}

function normalizeWebsite(value: string) {
  if (!value) return "";
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("Website does not look valid.");
  }
}

function validateLongAnswer(value: string, label: string, minLength = 20) {
  const clean = rejectJunkText(value, label, minLength);
  const letters = clean.match(/[A-Za-z]/g)?.length || 0;
  if (letters < 10) throw new Error(`${label} needs a little more detail.`);
  return clean;
}

function toZohoDateTime(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.toISOString().slice(0, 19)}+05:30`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildQualificationNotes(payload: ReturnType<typeof validatePayload>) {
  return [
    "Project Fit Validation submitted.",
    "",
    `Full name: ${payload.fullName}`,
    `Company: ${payload.companyName}`,
    `Designation: ${payload.designation}`,
    `Email: ${payload.workEmail}`,
    `Phone: ${payload.phoneNumber}`,
    `Website: ${payload.website || "Not shared"}`,
    "",
    `Business outcomes: ${payload.businessOutcomes.join(", ")}`,
    `Trigger reason: ${payload.triggerReasonNow}`,
    `6 month success definition: ${payload.month6SuccessDefinition}`,
    `Current stage: ${payload.currentStage}`,
    `Services considered: ${payload.servicesConsidered.join(", ")}`,
    `Expected investment range: ${payload.expectedInvestmentRange}`,
    `Start timeline: ${payload.startTimeline}`,
    `Decision involvement: ${payload.decisionInvolvement.join(", ")}`,
    `Past experience: ${payload.pastExperience}`,
    `Past experience notes: ${payload.pastExperienceNotes || "Not shared"}`,
    `Relevant links: ${payload.relevantLinks}`,
    "",
    `Source: ${payload.source}`,
    `UTM source: ${payload.utm_source || "Not available"}`,
    `UTM medium: ${payload.utm_medium || "Not available"}`,
    `UTM campaign: ${payload.utm_campaign || "Not available"}`,
    `UTM content: ${payload.utm_content || "Not available"}`,
    `UTM term: ${payload.utm_term || "Not available"}`,
  ].join("\n");
}

function validatePayload(body: Payload) {
  const fullName = validateFullName(requiredText(body.fullName, "Full name", 80));
  const companyName = validateSimpleText(requiredText(body.companyName, "Company name", 200), "Company name");
  const designation = validateSimpleText(requiredText(body.designation, "Designation", 100), "Designation");
  const workEmail = requiredText(body.workEmail, "Work email", 100).toLowerCase();
  const phoneNumber = validatePhone(requiredText(body.phoneNumber, "Phone number", 30));
  const fallbackEmail = text(body.email, 100).toLowerCase();

  if (!isValidEmail(workEmail)) throw new Error("Please enter a valid work email.");
  if (fallbackEmail && !isValidEmail(fallbackEmail)) throw new Error("The tracking email is invalid.");

  return {
    lead_id: text(body.lead_id, 32),
    email: fallbackEmail,
    source: text(body.source, 120) || "project-fit-validation",
    utm_source: text(body.utm_source, 255),
    utm_medium: text(body.utm_medium, 255),
    utm_campaign: text(body.utm_campaign, 255),
    utm_content: text(body.utm_content, 255),
    utm_term: text(body.utm_term, 255),
    fullName,
    companyName,
    designation,
    workEmail,
    phoneNumber,
    website: normalizeWebsite(text(body.website, 255)),
    businessOutcomes: optionList(body.businessOutcomes, businessOutcomes, "Business outcomes"),
    triggerReasonNow: validateLongAnswer(requiredText(body.triggerReasonNow, "Trigger reason", 6000), "Trigger reason"),
    month6SuccessDefinition: validateLongAnswer(requiredText(body.month6SuccessDefinition, "6 month success definition", 6000), "6 month success definition"),
    currentStage: option(body.currentStage, currentStages, "Current stage"),
    servicesConsidered: optionList(body.servicesConsidered, services, "Services considered"),
    expectedInvestmentRange: option(body.expectedInvestmentRange, investmentRanges, "Expected investment range"),
    startTimeline: option(body.startTimeline, timelines, "Start timeline"),
    decisionInvolvement: optionList(body.decisionInvolvement, decisionInvolvement, "Decision involvement"),
    pastExperience: option(body.pastExperience, pastExperiences, "Past experience"),
    pastExperienceNotes: text(body.pastExperienceNotes, 6000),
    relevantLinks: rejectJunkText(requiredText(body.relevantLinks, "Relevant links", 6000), "Relevant links", 8),
  };
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

async function findLeadId(accessToken: string, leadId: string, email: string, workEmail: string) {
  if (leadId) {
    const response = await fetch(`${ZOHO_API_BASE}/Leads/${encodeURIComponent(leadId)}?fields=id`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      cache: "no-store",
    });
    if (response.ok) return leadId;
  }

  const searchEmail = email || workEmail;
  const response = await fetch(`${ZOHO_API_BASE}/Leads/search?email=${encodeURIComponent(searchEmail)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return "";
  const data = await response.json();
  return text(data?.data?.[0]?.id, 32);
}

async function updateLead(accessToken: string, leadId: string, payload: ReturnType<typeof validatePayload>) {
  const record = {
    id: leadId,
    Last_Name: payload.fullName,
    Company: payload.companyName,
    Designation: payload.designation,
    Email: payload.workEmail,
    Phone: payload.phoneNumber,
    Website: payload.website || undefined,
    Project_Fit_Form_Status: "Submitted",
    Project_Fit_Email_Status: "Submitted",
    Project_Fit_Stop_Reason: "Project Alignment submitted",
    Project_Fit_Manual_Review: false,
    Project_Fit_Submitted_Date: toZohoDateTime(),
    Project_Fit_Source: payload.source,
    Business_Outcomes: payload.businessOutcomes,
    Trigger_Reason_Now: payload.triggerReasonNow,
    Month_6_Success_Definition: payload.month6SuccessDefinition,
    Current_Stage: payload.currentStage,
    Services_Considered: payload.servicesConsidered,
    Expected_Investment_Range: payload.expectedInvestmentRange,
    Start_Timeline: payload.startTimeline,
    Decision_Involvement: payload.decisionInvolvement,
    Past_Experience: payload.pastExperience,
    Past_Experience_Notes: payload.pastExperienceNotes || undefined,
    Relevant_Links: payload.relevantLinks,
    Qualification_Notes: buildQualificationNotes(payload),
    Project_Fit_UTM_Source: payload.utm_source || undefined,
    Project_Fit_UTM_Medium: payload.utm_medium || undefined,
    Project_Fit_UTM_Campaign: payload.utm_campaign || undefined,
    Project_Fit_UTM_Content: payload.utm_content || undefined,
    Project_Fit_UTM_Term: payload.utm_term || undefined,
  };

  const response = await fetch(`${ZOHO_API_BASE}/Leads`, {
    method: "PUT",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [record], trigger: ["workflow"] }),
    cache: "no-store",
  });

  const data = await response.json();
  const result = data?.data?.[0];
  if (!response.ok || result?.status !== "success") {
    throw new Error(result?.message || "Zoho CRM rejected the update.");
  }
}

async function sendInternalSubmissionNotification(
  accessToken: string,
  leadId: string,
  payload: ReturnType<typeof validatePayload>,
) {
  const fromEmail = process.env.ZOHO_MAIL_FROM_EMAIL;
  const fromName = process.env.ZOHO_MAIL_FROM_NAME || "Adwait";
  const replyTo = process.env.ZOHO_MAIL_REPLY_TO || fromEmail;
  const useOrgEmail = process.env.ZOHO_MAIL_ORG_EMAIL === "true";
  const notifyEmail = process.env.PROJECT_ALIGNMENT_NOTIFY_EMAIL || "adwait@theimpulsedigital.com";

  if (!fromEmail) throw new Error("ZOHO_MAIL_FROM_EMAIL is not configured on the server.");

  const leadSummary = [
    ["Lead", payload.fullName],
    ["Company", payload.companyName],
    ["Email", payload.workEmail],
    ["Phone", payload.phoneNumber],
    ["Website", payload.website || "Not shared"],
    ["Investment range", payload.expectedInvestmentRange],
    ["Start timeline", payload.startTimeline],
  ];

  const content = [
    "<p>A lead has submitted the Project Alignment form.</p>",
    "<table cellpadding=\"6\" cellspacing=\"0\" style=\"border-collapse:collapse;\">",
    ...leadSummary.map(
      ([label, value]) =>
        `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
    ),
    "</table>",
    "<p>Open the lead in Zoho CRM to review the full responses.</p>",
  ].join("");

  const response = await fetch(`${ZOHO_API_BASE}/Leads/${encodeURIComponent(leadId)}/actions/send_mail`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          from: { email: fromEmail, user_name: fromName },
          to: [{ email: notifyEmail, user_name: "Adwait" }],
          reply_to: replyTo ? { email: replyTo, user_name: fromName } : undefined,
          subject: `Project Alignment submitted: ${payload.fullName}`,
          content,
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
    const detail = result?.message || result?.code || data?.message || "Zoho CRM rejected the internal notification.";
    throw new Error(`Zoho CRM rejected the internal notification: ${detail}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    assertHoneypotIsEmpty(body);
    assertWithinRateLimit(request, body);
    const payload = validatePayload(body);
    const accessToken = await getAccessToken();
    const leadId = await findLeadId(accessToken, payload.lead_id, payload.email, payload.workEmail);

    if (!leadId) {
      return NextResponse.json(
        { error: "We could not find the CRM lead connected to this form. Please contact Impulse Digital." },
        { status: 404 },
      );
    }

    await updateLead(accessToken, leadId, payload);
    try {
      await sendInternalSubmissionNotification(accessToken, leadId, payload);
    } catch (notificationError) {
      console.error("Project Alignment internal notification failed:", notificationError);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong while submitting the form.";
    const status = message.includes("Too many submission attempts")
      ? 429
      : message.includes("Unable to submit")
        ? 400
        : message.includes("required") ||
            message.includes("invalid") ||
            message.includes("valid") ||
            message.includes("too short") ||
            message.includes("detail") ||
            message.includes("should")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
