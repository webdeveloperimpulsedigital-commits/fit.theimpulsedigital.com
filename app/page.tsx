"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import styles from "./page.module.css";

function ValidationFormContent() {
  const searchParams = useSearchParams();
  const lead_id = searchParams.get("lead_id") || "";
  const email = searchParams.get("email") || "";
  const source = searchParams.get("source") || "crm";

  // Multi-step form state
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [answers, setAnswers] = useState({
    budget: "",
    timeline: "",
    decisionMakers: "",
    scope: "",
    techStack: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const budgetOptions = [
    "Under $5,000",
    "$5,000 - $15,000",
    "$15,000 - $50,000",
    "$50,000+",
  ];

  const timelineOptions = [
    "Immediate (< 1 month)",
    "1 - 3 Months",
    "3 - 6 Months",
    "Flexible / Not Urgent",
  ];

  const decisionOptions = [
    "Yes, fully aligned",
    "No, currently aligning",
    "Partially / In Progress",
  ];

  const selectOption = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < totalSteps) setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const isStepValid = () => {
    if (step === 1) return !!answers.budget;
    if (step === 2) return !!answers.timeline;
    if (step === 3) return !!answers.decisionMakers;
    return true; // Step 4 contains optional text areas
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/project-fit-validation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: lead_id || "simulated_lead_id",
          email,
          answers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit validation details");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successIcon}>🚀</div>
        <h2 className={styles.title}>Validation Submitted!</h2>
        <p className={styles.subtitle} style={{ marginTop: "1rem" }}>
          Thank you. The CRM lead profile has been updated with the project alignment details.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.logoText}>Project Alignment Hub</div>
        <h1 className={styles.title}>Project Fit Validation</h1>
        <p className={styles.subtitle}>
          Help us align on project goals, scope, and expectations.
        </p>
      </header>

      {email && (
        <div className={styles.leadBanner}>
          <span>Validating Lead: <strong className={styles.leadEmail}>{email}</strong></span>
          <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Source: {source}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className={styles.stepIndicator}>
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
        </div>
      </div>

      {submitError && <div className={styles.errorBanner}>{submitError}</div>}

      {/* Step 1: Budget */}
      {step === 1 && (
        <div className={styles.formGroup}>
          <label className={styles.label}>What is your approximate project budget?</label>
          <div className={styles.grid}>
            {budgetOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => selectOption("budget", opt)}
                className={`${styles.optionCard} ${
                  answers.budget === opt ? styles.optionCardSelected : ""
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Timeline */}
      {step === 2 && (
        <div className={styles.formGroup}>
          <label className={styles.label}>What is your target launch timeline?</label>
          <div className={styles.grid}>
            {timelineOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => selectOption("timeline", opt)}
                className={`${styles.optionCard} ${
                  answers.timeline === opt ? styles.optionCardSelected : ""
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Decision Maker */}
      {step === 3 && (
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Are decision makers aligned on budget and project expectations?
          </label>
          <div className={styles.grid}>
            {decisionOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => selectOption("decisionMakers", opt)}
                className={`${styles.optionCard} ${
                  answers.decisionMakers === opt ? styles.optionCardSelected : ""
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Text Details */}
      {step === 4 && (
        <div className={styles.formGroup}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label}>Project Scope & Key Deliverables</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe the main components of the app or website..."
              value={answers.scope}
              onChange={(e) => handleTextChange("scope", e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label}>Technical Stack / Preferences (Optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Next.js, WordPress, React Native..."
              value={answers.techStack}
              onChange={(e) => handleTextChange("techStack", e.target.value)}
            />
          </div>

          <div>
            <label className={styles.label}>Additional Verification Notes</label>
            <textarea
              className={styles.textarea}
              placeholder="Any other comments or details to note..."
              value={answers.notes}
              onChange={(e) => handleTextChange("notes", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className={styles.navigation}>
        {step > 1 ? (
          <button onClick={prevStep} className={`${styles.btn} ${styles.btnPrev}`}>
            Back
          </button>
        ) : (
          <div />
        )}

        {step < totalSteps ? (
          <button
            onClick={nextStep}
            disabled={!isStepValid()}
            className={`${styles.btn} ${styles.btnNext}`}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isStepValid()}
            className={`${styles.btn} ${styles.btnNext}`}
          >
            {isSubmitting ? "Submitting..." : "Submit Validation"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.card}>Loading alignment hub...</div>}>
        <ValidationFormContent />
      </Suspense>
    </main>
  );
}
