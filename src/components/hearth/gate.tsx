import { useEffect, useState } from "react";
import { BadgeCheck, FileText, Landmark, Receipt, Scale, ScrollText } from "lucide-react";
import { analyze, verifiedAnnualCents } from "@/lib/hearth/engine";
import { KB_AS_OF } from "@/lib/hearth/knowledge";
import { formatUSD, formatUSDRange } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import { Bills } from "./bills";
import { DebtView } from "./debt-view";
import { Plan } from "./plan";
import { RecordView } from "./record";
import { Situation } from "./situation";
import { Verify } from "./verify";

export type Section = "situation" | "bills" | "plan" | "debt" | "verify" | "record";

const NAV: { id: Section; label: string; icon: typeof Receipt }[] = [
  { id: "situation", label: "Now", icon: ScrollText },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "plan", label: "Plan", icon: Scale },
  { id: "debt", label: "Debt", icon: Landmark },
  { id: "verify", label: "Proof", icon: BadgeCheck },
  { id: "record", label: "File", icon: FileText },
];

export function HearthGate() {
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("situation");

  useEffect(() => {
    void Promise.resolve(useHearth.persist.rehydrate()).then(() => setReady(true));
  }, []);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {ready ? <PrintBrief /> : null}
      <div className="no-print">
        <a href="#hearth-main" className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:bg-ink focus:p-3 focus:text-paper">
          Skip to the file
        </a>
        <header className="border-b border-line px-4 py-5 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm tracking-widest text-brass">HEARTH</p>
              <h1 className="font-display text-4xl text-ink">Household recovery file</h1>
              <div className="rule mt-3" />
            </div>
            <p className="max-w-sm text-sm text-muted">
              Estimates are not savings. Nothing here moves money, files an application, or decides eligibility.
              Knowledge dated {KB_AS_OF}.
            </p>
          </div>
        </header>
        {!ready ? (
          <main className="mx-auto max-w-5xl px-4 py-10">
            <p>Opening the file stored in this browser.</p>
          </main>
        ) : (
          <div className="mx-auto grid max-w-5xl lg:grid-cols-[12rem_1fr]">
            <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-paper lg:static lg:flex-col lg:border-t-0 lg:border-r lg:py-6">
              {NAV.map((item) => {
                const Icon = item.icon;
                const on = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={on ? "page" : undefined}
                    onClick={() => setSection(item.id)}
                    className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs lg:h-11 lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${on ? "text-ink" : "text-muted"}`}
                  >
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <main id="hearth-main" className="px-4 pt-2 pb-28 lg:px-8 lg:pb-16">
              {section === "situation" ? <Situation go={setSection} /> : null}
              {section === "bills" ? <Bills /> : null}
              {section === "plan" ? <Plan /> : null}
              {section === "debt" ? <DebtView /> : null}
              {section === "verify" ? <Verify /> : null}
              {section === "record" ? <RecordView /> : null}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function PrintBrief() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  const actions = useHearth((s) => s.actions);
  const verifications = useHearth((s) => s.verifications);
  const fictional = useHearth((s) => s.fictional);
  if (!profile) return null;
  const analysis = analyze(profile, bills);
  const verified = verifiedAnnualCents(verifications);
  return (
    <article className="print-only hidden px-6 py-8">
      <p className="text-sm text-muted">Hearth · {profile.state} · Knowledge {KB_AS_OF}</p>
      <h1 className="text-4xl">{profile.name || "Household file"}</h1>
      <div className="rule my-3" />
      {fictional ? <p>Fictional Hale file. Not a real household.</p> : null}
      <p>
        Take-home {formatUSD(analysis.monthlyIncomeCents)}. Bills {formatUSD(analysis.monthlyObligationsCents)}.{" "}
        {analysis.monthlySurplusCents >= 0 ? "Left" : "Short"} {formatUSD(Math.abs(analysis.monthlySurplusCents))}.
        Verified annual change {formatUSD(verified)}.
      </p>
      {analysis.findings.map((f) => (
        <section key={f.id} className="mt-4 border-t border-line pt-3">
          <h2 className="text-xl">{f.title}</h2>
          <p className="text-sm text-muted">
            {actions[f.id]?.status ?? "open"} · {formatUSDRange(f.estimateLowCents, f.estimateHighCents)}
          </p>
          <p>{f.detail}</p>
        </section>
      ))}
    </article>
  );
}
