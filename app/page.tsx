"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

type FormState = {
  url: string;
  fullName: string;
  companyName: string;
  designation: string;
  workEmail: string;
  phoneNumber: string;
  website: string;
  businessOutcomes: string[];
  triggerReasonNow: string;
  month6SuccessDefinition: string;
  currentStage: string;
  servicesConsidered: string[];
  expectedInvestmentRange: string;
  startTimeline: string;
  decisionInvolvement: string[];
  pastExperience: string;
  pastExperienceNotes: string;
  relevantLinks: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

const initialFormState: FormState = {
  url: "",
  fullName: "",
  companyName: "",
  designation: "",
  workEmail: "",
  phoneNumber: "",
  website: "",
  businessOutcomes: [],
  triggerReasonNow: "",
  month6SuccessDefinition: "",
  currentStage: "",
  servicesConsidered: [],
  expectedInvestmentRange: "",
  startTimeline: "",
  decisionInvolvement: [],
  pastExperience: "",
  pastExperienceNotes: "",
  relevantLinks: "",
};

const businessOutcomeOptions = [
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

const currentStageOptions = [
  "We know the exact service we need",
  "We know the business problem, but need help deciding the right solution",
  "We have tried something earlier and want to improve it",
  "We are comparing agencies or partners",
  "We are only exploring possibilities right now",
];

const serviceOptions = [
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

const investmentOptions = [
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

const timelineOptions = [
  "Immediately",
  "Within 2 to 4 weeks",
  "Within 1 to 2 months",
  "In the next quarter",
  "No fixed timeline yet",
];

const decisionOptions = [
  "Founder or business owner",
  "CEO, MD, or CXO",
  "Marketing head",
  "HR or employer branding head",
  "Sales or business head",
  "Procurement or finance",
  "I am the final decision-maker",
  "I am gathering information for someone else",
];

const pastExperienceOptions = [
  "Yes, with an agency",
  "Yes, with a freelancer",
  "Yes, with an internal team",
  "No, this is our first serious attempt",
  "We are currently working with someone, but evaluating alternatives",
];

function getParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key)?.trim() || "";
}

const fullNamePattern = "^[A-Za-z][-A-Za-z .']{1,79}$";
const workEmailPattern = "^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$";
const phonePattern = "^\\+?[0-9][0-9\\s().-]{9,29}$";

function getClientValidationError(form: FormState) {
  const fullName = form.fullName.trim();
  const phoneDigits = form.phoneNumber.replace(/\D/g, "");
  const website = form.website.trim();

  if (!/^[A-Za-z][-A-Za-z .']{1,79}$/.test(fullName) || /\d/.test(fullName)) {
    return "Full name should not contain numbers or symbols other than spaces, apostrophes, hyphens, or full stops.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(form.workEmail.trim())) {
    return "Please enter a valid email address.";
  }

  if (phoneDigits.length < 10 || phoneDigits.length > 15 || !/^\+?[0-9][0-9\s().-]{9,29}$/.test(form.phoneNumber.trim())) {
    return "Phone number should contain 10 to 15 digits.";
  }

  if (website) {
    try {
      const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
      if (!url.hostname.includes(".")) return "Please enter a valid website.";
    } catch {
      return "Please enter a valid website.";
    }
  }

  return "";
}

function ProjectFitForm({ onSuccess }: { onSuccess: () => void }) {
  const searchParams = useSearchParams();
  const tracking = useMemo(
    () => ({
      lead_id: getParam(searchParams, "lead_id"),
      email: getParam(searchParams, "email"),
      source: getParam(searchParams, "source") || "project-fit-validation",
      utm_source: getParam(searchParams, "utm_source"),
      utm_medium: getParam(searchParams, "utm_medium"),
      utm_campaign: getParam(searchParams, "utm_campaign"),
      utm_content: getParam(searchParams, "utm_content"),
      utm_term: getParam(searchParams, "utm_term"),
    }),
    [searchParams],
  );

  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    workEmail: tracking.email,
  });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleArrayField(field: "businessOutcomes" | "servicesConsidered" | "decisionInvolvement", value: string) {
    setForm((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;

    const clientValidationError = getClientValidationError(form);
    if (clientValidationError) {
      setSubmitState("error");
      setErrorMessage(clientValidationError);
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/project-fit-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tracking, ...form }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "We could not submit the form. Please try again.");
      }

      setSubmitState("success");
      onSuccess();
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(error instanceof Error ? error.message : "We could not submit the form. Please try again.");
    }
  }

  if (submitState === "success") {
    return (
      <section className={styles.resultPanel} aria-live="polite">
        <h1>Thank you for sharing your responses.</h1>
        <p>Our team will review the details and reach out to schedule a focused discovery conversation.</p>
      </section>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.honeypot} aria-hidden="true">
        Website URL
        <input
          value={form.url}
          onChange={(event) => updateField("url", event.target.value)}
          name="url"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <section className={styles.section} aria-labelledby="identity-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Your details</p>
          <h2 id="identity-heading">Who should we connect this context to?</h2>
        </div>
        <div className={styles.fieldGrid}>
          <Field label="Full name" required>
            <input
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value.replace(/[^A-Za-z .'-]/g, ""))}
              name="fullName"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              pattern={fullNamePattern}
              title="Please enter a valid name using letters, spaces, apostrophes, hyphens, or full stops."
              required
            />
          </Field>
          <Field label="Company name" required>
            <input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} name="companyName" autoComplete="organization" minLength={2} maxLength={200} required />
          </Field>
          <Field label="Designation" required>
            <input value={form.designation} onChange={(event) => updateField("designation", event.target.value)} name="designation" autoComplete="organization-title" minLength={2} maxLength={100} required />
          </Field>
          <Field label="Work email" required>
            <input
              value={form.workEmail}
              onChange={(event) => updateField("workEmail", event.target.value)}
              name="workEmail"
              type="email"
              autoComplete="email"
              maxLength={100}
              pattern={workEmailPattern}
              title="Please enter a valid email address."
              required
            />
          </Field>
          <Field label="Phone number" required>
            <input
              value={form.phoneNumber}
              onChange={(event) => updateField("phoneNumber", event.target.value.replace(/[^0-9+\s().-]/g, ""))}
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              pattern={phonePattern}
              title="Please enter a valid phone number with at least 10 digits."
              required
            />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(event) => updateField("website", event.target.value)} name="website" type="text" inputMode="url" maxLength={255} placeholder="example.com" />
          </Field>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="context-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Business context</p>
          <h2 id="context-heading">What needs to change?</h2>
        </div>
        <CheckboxGroup
          label="What are you looking to solve right now?"
          name="businessOutcomes"
          options={businessOutcomeOptions}
          selected={form.businessOutcomes}
          onToggle={(value) => toggleArrayField("businessOutcomes", value)}
          required
        />
        <Field label="What made this requirement important now?" required>
          <textarea value={form.triggerReasonNow} onChange={(event) => updateField("triggerReasonNow", event.target.value)} name="triggerReasonNow" rows={5} minLength={20} maxLength={6000} required />
        </Field>
        <Field label="What would success look like 6 months from now?" required>
          <textarea value={form.month6SuccessDefinition} onChange={(event) => updateField("month6SuccessDefinition", event.target.value)} name="month6SuccessDefinition" rows={5} minLength={20} maxLength={6000} required />
        </Field>
        <RadioGroup
          label="Which of these best describes your current stage?"
          name="currentStage"
          options={currentStageOptions}
          value={form.currentStage}
          onChange={(value) => updateField("currentStage", value)}
          required
        />
      </section>

      <section className={styles.section} aria-labelledby="commercial-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Services and investment</p>
          <h2 id="commercial-heading">What kind of engagement are we evaluating?</h2>
        </div>
        <CheckboxGroup
          label="What services are you considering?"
          name="servicesConsidered"
          options={serviceOptions}
          selected={form.servicesConsidered}
          onToggle={(value) => toggleArrayField("servicesConsidered", value)}
          required
        />
        <RadioGroup
          label="What is your expected investment range?"
          name="expectedInvestmentRange"
          options={investmentOptions}
          value={form.expectedInvestmentRange}
          onChange={(value) => updateField("expectedInvestmentRange", value)}
          required
        />
        <RadioGroup
          label="By when do you want to start?"
          name="startTimeline"
          options={timelineOptions}
          value={form.startTimeline}
          onChange={(value) => updateField("startTimeline", value)}
          required
        />
      </section>

      <section className={styles.section} aria-labelledby="decision-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Decision process</p>
          <h2 id="decision-heading">Who is involved and what has been tried?</h2>
        </div>
        <CheckboxGroup
          label="Who will be involved in approving this decision?"
          name="decisionInvolvement"
          options={decisionOptions}
          selected={form.decisionInvolvement}
          onToggle={(value) => toggleArrayField("decisionInvolvement", value)}
          required
        />
        <RadioGroup
          label="Have you worked with an agency, freelancer, or internal team for this before?"
          name="pastExperience"
          options={pastExperienceOptions}
          value={form.pastExperience}
          onChange={(value) => updateField("pastExperience", value)}
          required
        />
        <Field label="What worked or did not work earlier?">
          <textarea value={form.pastExperienceNotes} onChange={(event) => updateField("pastExperienceNotes", event.target.value)} name="pastExperienceNotes" rows={4} maxLength={6000} />
        </Field>
        <Field label="Please share your website, social handles, or any relevant links." required>
          <textarea value={form.relevantLinks} onChange={(event) => updateField("relevantLinks", event.target.value)} name="relevantLinks" rows={4} minLength={8} maxLength={6000} required />
        </Field>
      </section>

      {submitState === "error" && <p className={styles.errorMessage}>{errorMessage}</p>}

      <div className={styles.submitBar}>
        <p>Your responses are reviewed by the Impulse Digital team before any next step is recommended.</p>
        <button type="submit" disabled={submitState === "submitting"}>
          {submitState === "submitting" ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>
        {label}
        {required ? <b aria-hidden="true"> *</b> : null}
      </span>
      {children}
    </label>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  selected,
  onToggle,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>
        {label}
        {required ? <b aria-hidden="true"> *</b> : null}
      </legend>
      <div className={styles.choiceGrid}>
        {options.map((option, index) => (
          <label key={option} className={styles.choice}>
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              required={required && selected.length === 0 && index === 0}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>
        {label}
        {required ? <b aria-hidden="true"> *</b> : null}
      </legend>
      <div className={styles.choiceGrid}>
        {options.map((option) => (
          <label key={option} className={styles.choice}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} required={required} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Home() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <main className={styles.pageShell}>
        <section className={`${styles.resultPanel} ${styles.successPanel}`} aria-live="polite">
          <Image className={styles.logo} src="/brand/impulse-digital-logo.svg" alt="Impulse Digital" width={184} height={88} priority />
          <h1>Thank you for sharing your responses.</h1>
          <p>Our team will review the details and reach out to schedule a focused discovery conversation.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <section className={styles.hero}>
        <div className={styles.brandRow}>
          <Image className={styles.logo} src="/brand/impulse-digital-logo.svg" alt="Impulse Digital" width={184} height={88} priority />
        </div>
        <h1>Project Alignment</h1>
        <div className={styles.intro}>
          <p>Thank you for reaching out to Impulse Digital.</p>
          <p>
            This short form helps us understand the business context, urgency, expected investment
            range, and whether Impulse Digital is the right partner for the requirement.
          </p>
          <p>
            It should take 5 to 7 minutes to complete. Once submitted, the team will review the
            details and get back with the most appropriate next step.
          </p>
        </div>
      </section>

      <Suspense fallback={<p className={styles.loading}>Loading form...</p>}>
        <ProjectFitForm onSuccess={() => setIsSubmitted(true)} />
      </Suspense>
    </main>
  );
}
