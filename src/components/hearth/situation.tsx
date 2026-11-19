import { useState } from "react";
import { analyze, verifiedAnnualCents } from "@/lib/hearth/engine";
import { formatUSD, formatUSDRange, parseDollars, todayISO } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import type { Housing, Profile } from "@/lib/hearth/types";
import { US_STATES } from "@/lib/hearth/types";
import type { Section } from "./gate";
import { Check, Field, Panel, SelectInput, Stat, TextInput } from "./ui";

const empty = {
  name: "",
  state: "",
  size: "1",
  childrenUnder5: "0",
  income: "",
  savings: "",
  housing: "rent" as Housing,
  pregnantOrPostpartum: false,
  disability: false,
  age65Plus: false,
  veteran: false,
  recentJobLoss: false,
  hasStudentLoans: false,
  hasMedicalBills: false,
};

export function Situation({ go }: { go: (section: Section) => void }) {
  const profile = useHearth((s) => s.profile);
  const fictional = useHearth((s) => s.fictional);
  const loadExample = useHearth((s) => s.loadExample);
  if (!profile) {
    return (
      <div className="py-6">
        <p className="max-w-xl text-lg">
          Start with the money that actually arrives and the bills that actually leave. Hearth keeps the file in this
          browser. It does not ask for a bank login.
        </p>
        <Intake initial={empty} submitLabel="Open the file" fictional={false} onDone={() => undefined} />
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <button type="button" className="btn btn-quiet" onClick={() => loadExample()}>
            Load the fictional Hale household
          </button>
          <p className="text-sm text-muted">Illinois, three people, made-up bills. For seeing the method, not for decisions.</p>
        </div>
      </div>
    );
  }

  return <Dashboard go={go} fictional={fictional} profile={profile} />;
}

function Dashboard({
  go,
  fictional,
  profile,
}: {
  go: (section: Section) => void;
  fictional: boolean;
  profile: Profile;
}) {
  const bills = useHearth((s) => s.bills);
  const actions = useHearth((s) => s.actions);
  const verifications = useHearth((s) => s.verifications);
  const [editing, setEditing] = useState(false);
  const analysis = analyze(profile, bills);
  const verified = verifiedAnnualCents(verifications);
  const today = todayISO();
  const due = analysis.findings.filter((f) => {
    const follow = actions[f.id]?.followUp;
    const status = actions[f.id]?.status ?? "open";
    return follow != null && follow <= today && (status === "open" || status === "doing");
  });
  const asks = analysis.programs.filter((p) => p.status === "ask");
  const short = analysis.monthlySurplusCents < 0;

  return (
    <div className="py-6">
      {fictional ? (
        <p className="mb-6 border border-brass bg-brass-soft px-4 py-3 text-sm">
          This is the fictional Hale household. Replace it before you act on any number.
        </p>
      ) : null}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {profile.name || "Household"} · {profile.state} · {profile.size} {profile.size === 1 ? "person" : "people"}
          </p>
          <h2 className="text-3xl">{short ? "The month is short." : "The month covers the list."}</h2>
        </div>
        <button type="button" className="btn btn-quiet" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close" : "Edit household"}
        </button>
      </div>
      <div className="rule mt-4" />
      {editing ? (
        <Intake
          initial={{
            name: profile.name,
            state: profile.state,
            size: String(profile.size),
            childrenUnder5: String(profile.childrenUnder5),
            income: (profile.monthlyTakeHomeCents / 100).toFixed(2),
            savings: (profile.savingsCents / 100).toFixed(2),
            housing: profile.housing,
            pregnantOrPostpartum: profile.pregnantOrPostpartum,
            disability: profile.disability,
            age65Plus: profile.age65Plus,
            veteran: profile.veteran,
            recentJobLoss: profile.recentJobLoss,
            hasStudentLoans: profile.hasStudentLoans,
            hasMedicalBills: profile.hasMedicalBills,
          }}
          submitLabel="Save household"
          fictional={fictional}
          onDone={() => setEditing(false)}
        />
      ) : null}
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        <Stat label="Take-home" value={formatUSD(analysis.monthlyIncomeCents)} note="After tax, as entered." />
        <Stat label="Bills on this list" value={formatUSD(analysis.monthlyObligationsCents)} />
        <Stat
          label={short ? "Short each month" : "Left each month"}
          value={formatUSD(Math.abs(analysis.monthlySurplusCents))}
          tone={short ? "brass" : "ink"}
          note={
            analysis.housingRatio != null
              ? `Housing is ${Math.round(analysis.housingRatio * 100)}% of take-home.`
              : "Add take-home to see the housing share."
          }
        />
      </div>
      <Panel>
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <Stat
            label="Verified annual change"
            value={formatUSD(verified)}
            tone="pine"
            note="Only rows you confirmed under Proof. Estimates are not in this number."
          />
          <button type="button" className="btn btn-ink" onClick={() => go("verify")}>
            Record a confirmed change
          </button>
        </div>
      </Panel>
      {due.length > 0 ? (
        <Panel>
          <h2 className="text-2xl">Follow-ups due</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {due.map((f) => (
              <li key={f.id} className="text-base">
                {f.title} · {actions[f.id]?.followUp}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl">Do these first</h2>
          <button type="button" className="btn btn-quiet" onClick={() => go("plan")}>
            Full plan
          </button>
        </div>
        {bills.length === 0 ? (
          <p className="mt-3 text-muted">No bills yet. The plan is mostly guesswork until the ledger has the real ones.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-4">
            {analysis.findings.slice(0, 3).map((f, i) => (
              <li key={f.id} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="font-display text-2xl text-brass">{i + 1}</span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted">{formatUSDRange(f.estimateLowCents, f.estimateHighCents)} · {f.confidence} confidence</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <Panel>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl">Worth a phone call</h2>
          <button type="button" className="btn btn-quiet" onClick={() => go("plan")}>
            See why
          </button>
        </div>
        {asks.length === 0 ? (
          <p className="mt-3 text-muted">Nothing on the income screen is marked worth asking. Read the plan anyway — unlikely is not a denial.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {asks.slice(0, 4).map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          Savings on hand: {formatUSD(profile.savingsCents)}. That number is not a benefit and not an emergency-fund grade.
        </p>
      </Panel>
    </div>
  );
}

function Intake({
  initial,
  submitLabel,
  fictional,
  onDone,
}: {
  initial: typeof empty;
  submitLabel: string;
  fictional: boolean;
  onDone: () => void;
}) {
  const setProfile = useHearth((s) => s.setProfile);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  function save() {
    const income = parseDollars(form.income);
    const savings = parseDollars(form.savings === "" ? "0" : form.savings);
    const size = Number(form.size);
    const kids = Number(form.childrenUnder5);
    if (!form.state) {
      setError("Choose a state. Alaska and Hawaii are screened differently.");
      return;
    }
    if (income == null) {
      setError("Enter monthly take-home as a dollar amount.");
      return;
    }
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      setError("Household size needs to be a whole number from 1 to 20.");
      return;
    }
    if (!Number.isInteger(kids) || kids < 0 || kids > size) {
      setError("Children under five cannot exceed the household size.");
      return;
    }
    const profile: Profile = {
      name: form.name.trim(),
      state: form.state,
      size,
      childrenUnder5: kids,
      monthlyTakeHomeCents: income,
      savingsCents: savings ?? 0,
      housing: form.housing,
      pregnantOrPostpartum: form.pregnantOrPostpartum,
      disability: form.disability,
      age65Plus: form.age65Plus,
      veteran: form.veteran,
      recentJobLoss: form.recentJobLoss,
      hasStudentLoans: form.hasStudentLoans,
      hasMedicalBills: form.hasMedicalBills,
    };
    setProfile(profile, { fictional });
    setError("");
    onDone();
  }

  return (
    <form
      className="mt-6 grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Name for this file" hint="Optional. It stays on this device.">
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Our household" />
      </Field>
      <Field label="State">
        <SelectInput value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
          <option value="">Select a state</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="People in the household">
        <TextInput inputMode="numeric" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
      </Field>
      <Field label="Children under five">
        <TextInput
          inputMode="numeric"
          value={form.childrenUnder5}
          onChange={(e) => setForm({ ...form, childrenUnder5: e.target.value })}
        />
      </Field>
      <Field label="Monthly take-home" hint="What hits the account. Not gross pay. Programs use gross, and the plan says so.">
        <TextInput inputMode="decimal" value={form.income} onChange={(e) => setForm({ ...form, income: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Cash you could use this month" hint="Checking and savings you can actually touch. Skip debts.">
        <TextInput inputMode="decimal" value={form.savings} onChange={(e) => setForm({ ...form, savings: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Housing">
        <SelectInput value={form.housing} onChange={(e) => setForm({ ...form, housing: e.target.value as Housing })}>
          <option value="rent">Rent</option>
          <option value="own">Own</option>
          <option value="other">Something else</option>
        </SelectInput>
      </Field>
      <div className="sm:col-span-2 grid gap-1 sm:grid-cols-2">
        <Check label="Pregnant or postpartum" checked={form.pregnantOrPostpartum} onChange={(v) => setForm({ ...form, pregnantOrPostpartum: v })} />
        <Check label="Disability in the household" checked={form.disability} onChange={(v) => setForm({ ...form, disability: v })} />
        <Check label="Someone is 65 or older" checked={form.age65Plus} onChange={(v) => setForm({ ...form, age65Plus: v })} />
        <Check label="Veteran" checked={form.veteran} onChange={(v) => setForm({ ...form, veteran: v })} />
        <Check label="Job loss in the last few months" checked={form.recentJobLoss} onChange={(v) => setForm({ ...form, recentJobLoss: v })} />
        <Check label="Federal student loans" checked={form.hasStudentLoans} onChange={(v) => setForm({ ...form, hasStudentLoans: v })} />
        <Check label="Unpaid medical bills" checked={form.hasMedicalBills} onChange={(v) => setForm({ ...form, hasMedicalBills: v })} />
      </div>
      {error ? <p className="sm:col-span-2 text-sm text-brass">{error}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-ink">{submitLabel}</button>
      </div>
    </form>
  );
}
