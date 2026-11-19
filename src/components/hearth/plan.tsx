import { useState } from "react";
import { confidenceWord, analyze, riskWord } from "@/lib/hearth/engine";
import { formatUSDRange } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import type { ActionStatus, Finding, ProgramMatch, ProgramStatus } from "@/lib/hearth/types";
import { Panel } from "./ui";

const STATUS: { id: ActionStatus; label: string }[] = [
  { id: "open", label: "Not started" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
  { id: "skipped", label: "Won't do" },
];

const PROGRAM_LABEL: Record<ProgramStatus, string> = {
  ask: "Worth asking",
  unlikely: "Unlikely on income alone",
  closed: "Closed — do not chase",
  info: "Read, then decide",
  not_indicated: "Not indicated by this file",
};

export function Plan() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  if (!profile) {
    return (
      <div className="py-6">
        <h2 className="text-3xl">The plan needs a household</h2>
        <p className="mt-3 max-w-xl text-muted">Open the file under Now. Without take-home and a state, assistance screens would be fiction.</p>
      </div>
    );
  }
  const analysis = analyze(profile, bills);
  return (
    <div className="py-6">
      <h2 className="text-3xl">Ranked work</h2>
      <p className="mt-2 max-w-xl text-muted">
        A cash shortfall stays first. Everything else is ordered by the middle of its annual range, discounted for low
        confidence, higher risk, and time. Ranges are not added together. They overlap, and none of them are savings.
      </p>
      {analysis.findings.length === 0 ? (
        <p className="mt-6">Nothing in the rules fired. That can mean the list is thin, not that the month is fine.</p>
      ) : (
        <div className="mt-4">
          {analysis.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
      <Panel>
        <h2 className="text-3xl">Assistance, with the uncertainty left on</h2>
        <p className="mt-2 max-w-xl text-muted">
          Take-home is compared with published gross limits. If take-home is already over a gross limit, gross cannot
          qualify on income alone. If take-home is under it, gross might still be over it. Alaska and Hawaii are not
          failed against the 48-state table.
        </p>
        <div className="mt-4">
          {analysis.programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const record = useHearth((s) => s.actions[finding.id]);
  const setAction = useHearth((s) => s.setAction);
  const status = record?.status ?? "open";
  const [note, setNote] = useState(record?.note ?? "");
  const [date, setDate] = useState(record?.followUp ?? "");

  return (
    <article className="border-t border-line py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl">{finding.title}</h3>
        <p className="text-sm tabular-nums text-brass">{formatUSDRange(finding.estimateLowCents, finding.estimateHighCents)}</p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {confidenceWord(finding.confidence)} · {riskWord(finding.risk)} · about {finding.hours} h · illustrative, not verified
      </p>
      <p className="mt-3 max-w-2xl">{finding.detail}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        {finding.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
        {finding.sources.map((s) => (
          <li key={s.url + s.name}>
            <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-brass underline-offset-4">
              {s.name}
            </a>
            <span> · {s.asOf}</span>
            {s.note ? <span className="block">{s.note}</span> : null}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAction(finding.id, { status: item.id })}
              className={`btn ${status === item.id ? "btn-ink" : "btn-quiet"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-col gap-1 text-sm">
            Follow up
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="field-input"
              placeholder="What the company actually said"
            />
          </label>
          <button
            type="button"
            className="btn btn-quiet self-end"
            onClick={() => setAction(finding.id, { followUp: date || null, note })}
          >
            Save note
          </button>
        </div>
      </div>
    </article>
  );
}

function ProgramCard({ program }: { program: ProgramMatch }) {
  const tone =
    program.status === "closed"
      ? "border-ink"
      : program.status === "ask"
        ? "bg-brass-soft"
        : "";
  return (
    <article className={`border-t border-line py-5 ${tone} ${program.status === "ask" ? "px-4" : ""}`}>
      <p className="text-sm text-muted">{PROGRAM_LABEL[program.status]}</p>
      <h3 className="text-2xl">{program.name}</h3>
      <p className="mt-1 text-sm text-muted">{program.summary}</p>
      <p className="mt-3 max-w-2xl">{program.why}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {program.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        {program.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-3 underline decoration-brass underline-offset-4">
            {s.name}
          </a>
        ))}
      </p>
    </article>
  );
}
