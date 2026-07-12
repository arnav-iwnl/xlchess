import { useState } from "react";
import { trackEvent } from "../lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  function validate(v) {
    const e = {};
    if (!v.name.trim()) e.name = "Enter your name.";
    if (!v.email.trim()) e.email = "Enter your email.";
    else if (!EMAIL_RE.test(v.email)) e.email = "Enter a valid email address.";
    if (!v.message.trim()) e.message = "Tell us what's on your mind.";
    else if (v.message.trim().length < 10) e.message = "A few more words would help — 10 characters minimum.";
    return e;
  }

  function handleChange(field) {
    return (ev) => {
      const next = { ...values, [field]: ev.target.value };
      setValues(next);
      if (errors[field]) setErrors(validate(next));
    };
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const foundErrors = validate(values);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setStatus("sending");
    trackEvent("contact_submit_attempt");
    try {
      // No backend exists for this assessment — this simulates a network
      // round trip so the UI's loading/success/error states are all real
      // and testable. See README for how a production submit handler
      // would replace this block.
      await new Promise((resolve, reject) =>
        setTimeout(() => (Math.random() < 0.94 ? resolve() : reject(new Error("network"))), 900)
      );
      setStatus("sent");
      trackEvent("contact_submit_success");
    } catch {
      setStatus("error");
      trackEvent("contact_submit_error");
    }
  }

  if (status === "sent") {
    return (
      <section id="contact" className="py-[96px] pb-[120px] border-t border-line">
        <div className="container grid grid-cols-[0.9fr_1.1fr] max-[860px]:grid-cols-1 gap-[56px] max-[860px]:gap-[32px]">
          <div className="col-span-full text-center py-[60px] px-[20px]" role="status">
            <h2 className="text-[1.8rem] font-semibold">Message sent</h2>
            <p className="mt-[10px] text-mist">Thanks, {values.name.split(" ")[0]}. We usually reply within a business day.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-[96px] pb-[120px] border-t border-line">
      <div className="container grid grid-cols-[0.9fr_1.1fr] max-[860px]:grid-cols-1 gap-[56px] max-[860px]:gap-[32px]">
        <div>
          <p className="section-label">GET IN TOUCH</p>
          <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold max-w-[16ch]">Questions, bugs, or ideas?</h2>
          <p className="mt-[14px] text-mist max-w-[42ch] leading-[1.6]">
            Whether it's a rules edge-case, a feature you wish existed, or something that broke —
            we read every message.
          </p>
        </div>

        <form className="bg-ink-2 border border-ink-3 rounded-[16px] p-[28px] flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-[6px]">
            <label className="font-mono text-[0.76rem] tracking-[0.05em] text-mist uppercase" htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              className="bg-ink border border-ink-3 rounded-[10px] py-[12px] px-[14px] text-paper font-body text-[0.95rem] resize-y focus:outline-2 focus:outline-violet-2 focus:outline-offset-[1px] focus:border-violet-2 aria-[invalid=true]:border-[#e05a4e]"
              value={values.name}
              onChange={handleChange("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <p className="m-0 text-[#ff9089] text-[0.8rem]" id="name-error">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="font-mono text-[0.76rem] tracking-[0.05em] text-mist uppercase" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="bg-ink border border-ink-3 rounded-[10px] py-[12px] px-[14px] text-paper font-body text-[0.95rem] resize-y focus:outline-2 focus:outline-violet-2 focus:outline-offset-[1px] focus:border-violet-2 aria-[invalid=true]:border-[#e05a4e]"
              value={values.email}
              onChange={handleChange("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <p className="m-0 text-[#ff9089] text-[0.8rem]" id="email-error">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="font-mono text-[0.76rem] tracking-[0.05em] text-mist uppercase" htmlFor="message">Message</label>
            <textarea
              id="message"
              rows={5}
              className="bg-ink border border-ink-3 rounded-[10px] py-[12px] px-[14px] text-paper font-body text-[0.95rem] resize-y focus:outline-2 focus:outline-violet-2 focus:outline-offset-[1px] focus:border-violet-2 aria-[invalid=true]:border-[#e05a4e]"
              value={values.message}
              onChange={handleChange("message")}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "message-error" : undefined}
            />
            {errors.message && <p className="m-0 text-[#ff9089] text-[0.8rem]" id="message-error">{errors.message}</p>}
          </div>

          {status === "error" && (
            <p className="m-0 bg-[rgba(224,90,78,0.12)] border border-[rgba(224,90,78,0.4)] text-[#ff9089] py-[10px] px-[14px] rounded-[10px] text-[0.85rem]" role="alert">
              Something went wrong sending that. Please try again in a moment.
            </p>
          )}

          <button className="btn btn-primary self-start disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </section>
  );
}
