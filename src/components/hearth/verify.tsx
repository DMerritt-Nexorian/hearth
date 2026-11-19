import { useState } from "react";
import { analyze, verifiedAnnualCents } from "@/lib/hearth/engine";
import { formatUSD, parseDollars, todayISO } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import { Field, Panel, SelectInput, Stat, TextInput } from "./ui";

export function Verify() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  const verifications = useHearth((s) => s.verifications);
  const add = useHearth((s) => s.addVerification);
  const remove = useHearth((s) => s.removeVerification);
  const findings = profile ? analyze(profile, bills).findings : [];
  const [label, setLabel] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [findingId, setFindingId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const annual = verifiedAnnualCents(verifications);

  function save() {
    const b = parseDollars(before);
    const a = parseDollars(after);
    if (!label.trim()) {
      setError("Name what changed.");
      return;
    }
    if (b == null || a == null) {
      setError("Before and after need to be dollar amounts. Use the new bill, not the estimate.");
      return;
    }
    if (!date) {
      setError("Add the date you confirmed it.");
      return;
    }
    add({
      findingId: findingId || null,
      label: label.trim(),
      monthlyBeforeCents: b,
      monthlyAfterCents: a,
      confirmedOn: date,
      note: note.trim(),
    });
    setLabel("");
    setBefore("");
    setAfter("");
    setNote("");
    setFindingId("");
    setError("");
  }

  return (
    <div className="py-6">
      <h2 className="text-3xl">Count only what changed</h2>
      <p className="mt-2 max-w-xl">
        A row belongs here after a later statement, a canceled charge, or a written waiver. If the bill did not move, do not enter the estimate.
      </p>
      <div className="mt-6">
        <Stat
          label="Verified annual change"
          value={formatUSD(annual)}
          tone="pine"
          note="Sum of confirmed monthly differences, times twelve. A cost increase is negative and stays in the total."
        />
      </div>
      <form
        className="mt-8 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="What changed">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home internet" />
        </Field>
        <Field label="Tied to a plan item" hint="Optional.">
          <SelectInput value={findingId} onChange={(e) => setFindingId(e.target.value)}>
            <option value="">Not tied</option>
            {findings.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Monthly before">
          <TextInput inputMode="decimal" value={before} onChange={(e) => setBefore(e.target.value)} />
        </Field>
        <Field label="Monthly after">
          <TextInput inputMode="decimal" value={after} onChange={(e) => setAfter(e.target.value)} />
        </Field>
        <Field label="Date confirmed">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Where you saw it">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="March statement, page 2" />
        </Field>
        {error ? <p className="text-sm text-brass sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-ink">
            Record verified change
          </button>
        </div>
      </form>
      <Panel>
        <h2 className="text-2xl">Confirmed rows</h2>
        {verifications.length === 0 ? <p className="mt-3 text-muted">None yet. The green number stays at zero until you put one here.</p> : null}
        <ul className="mt-3">
          {verifications.map((row) => {
            const delta = row.monthlyBeforeCents - row.monthlyAfterCents;
            return (
              <li key={row.id} className="flex flex-col gap-2 border-t border-line py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{row.label}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {formatUSD(row.monthlyBeforeCents)} → {formatUSD(row.monthlyAfterCents)} · {formatUSD(delta)} / month · {row.confirmedOn}
                  </p>
                  {row.note ? <p className="text-sm text-muted">{row.note}</p> : null}
                </div>
                {pending === row.id ? (
                  <button type="button" className="btn btn-brass" onClick={() => remove(row.id)}>
                    Confirm remove
                  </button>
                ) : (
                  <button type="button" className="btn btn-quiet" onClick={() => setPending(row.id)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
