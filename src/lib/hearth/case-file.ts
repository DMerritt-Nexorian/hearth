import { analyze } from "./engine.ts";
import { KB_AS_OF } from "./knowledge.ts";
import { formatUSD, formatUSDRange, todayISO } from "./money.ts";
import type { CaseData } from "./store.ts";
import type {
  ActionRecord,
  AuditEvent,
  Bill,
  BillCategory,
  BillCycle,
  Profile,
  Verification,
} from "./types.ts";
import { CATEGORY_LABEL } from "./types.ts";

const CYCLES: BillCycle[] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
const CATEGORIES: BillCategory[] = [
  "housing",
  "electric",
  "gas",
  "water",
  "internet",
  "phone",
  "insurance",
  "subscription",
  "transport",
  "groceries",
  "childcare",
  "medical",
  "debt",
  "banking",
  "other",
];

export type PortableCase = CaseData & { version: 1; exportedAt: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProfile(v: unknown): v is Profile {
  if (!isRecord(v)) return false;
  return (
    typeof v.name === "string" &&
    typeof v.state === "string" &&
    typeof v.size === "number" &&
    typeof v.childrenUnder5 === "number" &&
    typeof v.monthlyTakeHomeCents === "number" &&
    typeof v.savingsCents === "number" &&
    (v.housing === "rent" || v.housing === "own" || v.housing === "other") &&
    typeof v.pregnantOrPostpartum === "boolean" &&
    typeof v.disability === "boolean" &&
    typeof v.age65Plus === "boolean" &&
    typeof v.veteran === "boolean" &&
    typeof v.recentJobLoss === "boolean" &&
    typeof v.hasStudentLoans === "boolean" &&
    typeof v.hasMedicalBills === "boolean"
  );
}

function isBill(v: unknown): v is Bill {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    CATEGORIES.includes(v.category as BillCategory) &&
    typeof v.amountCents === "number" &&
    CYCLES.includes(v.cycle as BillCycle) &&
    typeof v.notes === "string"
  );
}

export function parseCaseFile(raw: unknown): PortableCase | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  if (raw.profile !== null && !isProfile(raw.profile)) return null;
  if (!Array.isArray(raw.bills) || !raw.bills.every(isBill)) return null;
  if (!Array.isArray(raw.verifications) || !Array.isArray(raw.audit)) return null;
  if (!isRecord(raw.actions)) return null;
  return {
    version: 1,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : todayISO(),
    profile: raw.profile as Profile | null,
    bills: raw.bills as Bill[],
    actions: raw.actions as Record<string, ActionRecord>,
    verifications: raw.verifications as Verification[],
    audit: raw.audit as AuditEvent[],
    fictional: raw.fictional === true,
    debtExtraCents: typeof raw.debtExtraCents === "number" ? raw.debtExtraCents : null,
  };
}

export function serializeCase(data: CaseData): string {
  const file: PortableCase = { version: 1, exportedAt: new Date().toISOString(), ...data };
  return JSON.stringify(file, null, 2);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

export function briefHtml(data: CaseData): string {
  const profile = data.profile;
  if (!profile) {
    return `<!doctype html><title>Hearth</title><p>No household file yet.</p>`;
  }
  const analysis = analyze(profile, data.bills);
  const verified = data.verifications.reduce(
    (s, v) => s + (v.monthlyBeforeCents - v.monthlyAfterCents) * 12,
    0,
  );
  const findings = analysis.findings
    .map((f) => {
      const status = data.actions[f.id]?.status ?? "open";
      return `<article><h2>${esc(f.title)}</h2><p class="meta">${esc(status)} · ${esc(formatUSDRange(f.estimateLowCents, f.estimateHighCents))} · ${esc(f.confidence)} confidence · ${f.hours} h</p><p>${esc(f.detail)}</p><ol>${f.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol><p class="src">${f.sources.map((s) => `${esc(s.name)} (${esc(s.asOf)})`).join(" · ")}</p></article>`;
    })
    .join("");
  const programs = analysis.programs
    .filter((p) => p.status === "ask" || p.status === "closed")
    .map(
      (p) =>
        `<article><h2>${esc(p.name)} — ${esc(p.status)}</h2><p>${esc(p.why)}</p><ul>${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></article>`,
    )
    .join("");
  const bills = data.bills
    .map(
      (b) =>
        `<li>${esc(b.name)} · ${esc(CATEGORY_LABEL[b.category])} · ${esc(formatUSD(b.amountCents))} ${esc(b.cycle)}</li>`,
    )
    .join("");
  const checks = data.verifications
    .map(
      (v) =>
        `<li>${esc(v.label)} · ${esc(formatUSD(v.monthlyBeforeCents))} to ${esc(formatUSD(v.monthlyAfterCents))} · confirmed ${esc(v.confirmedOn)}</li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hearth brief — ${esc(profile.name || "Household")}</title>
<style>
  body { margin: 0 auto; max-width: 42rem; padding: 2rem 1.25rem 4rem; background: #f3eee6; color: #1c1916; font: 17px/1.5 "Source Sans 3", "Segoe UI", sans-serif; }
  h1, h2 { font-family: Georgia, "Times New Roman", serif; font-weight: 560; line-height: 1.2; }
  h1 { font-size: 2.4rem; margin-bottom: 0.2rem; }
  h2 { font-size: 1.25rem; margin-bottom: 0.3rem; }
  .rule { height: 2px; width: 4rem; background: #8c6239; border: 0; margin: 0.8rem 0 1rem; }
  .warn { background: #f4eadc; padding: 0.8rem 1rem; }
  .num { font-variant-numeric: tabular-nums; }
  article { border-top: 1px solid #ddd4c6; padding: 1rem 0; }
  .meta, .src { color: #5f584f; font-size: 0.9rem; }
  ol, ul { padding-left: 1.2rem; }
</style>
<body>
  <p class="meta">Hearth · Household Economic Recovery Engine · Knowledge ${KB_AS_OF}</p>
  <h1>${esc(profile.name || "Household file")}</h1>
  <hr class="rule">
  <p class="warn">Estimates are not savings. This page does not apply for anything, move money, or decide eligibility. Verified amounts are only what was confirmed in the file. ${data.fictional ? "This copy started as the fictional Hale household." : ""}</p>
  <p>${esc(profile.state)} · ${profile.size} people · take-home <span class="num">${esc(formatUSD(analysis.monthlyIncomeCents))}</span> · bills <span class="num">${esc(formatUSD(analysis.monthlyObligationsCents))}</span> · ${analysis.monthlySurplusCents >= 0 ? "left" : "short"} <span class="num">${esc(formatUSD(Math.abs(analysis.monthlySurplusCents)))}</span></p>
  <p>Verified annual change: <strong class="num">${esc(formatUSD(verified))}</strong>. Ranges below are not added together because they overlap.</p>
  <h2>Bills entered</h2>
  <ul>${bills || "<li>None</li>"}</ul>
  <h2>Actions</h2>
  ${findings || "<p>No findings.</p>"}
  <h2>Programs to ask about, and programs that are closed</h2>
  ${programs || "<p>None marked.</p>"}
  <h2>Verified rows</h2>
  <ul>${checks || "<li>None yet.</li>"}</ul>
  <p class="src">Generated ${esc(todayISO())}. Open the official links in the live Hearth file before you act. Funding and income limits change.</p>
</body>
</html>`;
}

export function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
