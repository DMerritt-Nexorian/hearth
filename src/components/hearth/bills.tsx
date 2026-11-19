import { useState } from "react";
import { monthlyCents } from "@/lib/hearth/engine";
import { centsToInput, formatUSD, parseDollars, uid } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import type { Bill, BillCategory, BillCycle } from "@/lib/hearth/types";
import { CATEGORY_LABEL, CYCLE_LABEL } from "@/lib/hearth/types";
import { AreaInput, Field, Panel, SelectInput, TextInput } from "./ui";

type Draft = {
  id: string;
  name: string;
  category: BillCategory;
  amount: string;
  cycle: BillCycle;
  previous: string;
  balance: string;
  apr: string;
  lastReviewed: string;
  renewsOn: string;
  notes: string;
  more: boolean;
};

function blankDraft(): Draft {
  return {
    id: "",
    name: "",
    category: "other",
    amount: "",
    cycle: "monthly",
    previous: "",
    balance: "",
    apr: "",
    lastReviewed: "",
    renewsOn: "",
    notes: "",
    more: false,
  };
}

function fromBill(bill: Bill): Draft {
  return {
    id: bill.id,
    name: bill.name,
    category: bill.category,
    amount: centsToInput(bill.amountCents),
    cycle: bill.cycle,
    previous: centsToInput(bill.previousAmountCents),
    balance: centsToInput(bill.balanceCents),
    apr: bill.aprPercent == null ? "" : String(bill.aprPercent),
    lastReviewed: bill.lastReviewed ?? "",
    renewsOn: bill.renewsOn ?? "",
    notes: bill.notes,
    more: true,
  };
}

const QUICK: { name: string; category: BillCategory }[] = [
  { name: "Rent", category: "housing" },
  { name: "Electric", category: "electric" },
  { name: "Phone", category: "phone" },
  { name: "Groceries", category: "groceries" },
  { name: "Insurance", category: "insurance" },
];

export function Bills() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  const upsert = useHearth((s) => s.upsertBill);
  const remove = useHearth((s) => s.removeBill);
  const markReviewed = useHearth((s) => s.markReviewed);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [error, setError] = useState("");
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const duplicate =
    draft.name.trim().length > 0 &&
    bills.some((b) => b.id !== draft.id && b.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
  const shown = bills.filter((b) => {
    const hay = `${b.name} ${CATEGORY_LABEL[b.category]}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const ledgerMonthly = bills.reduce((sum, bill) => sum + monthlyCents(bill), 0);

  function save() {
    const amount = parseDollars(draft.amount);
    if (!draft.name.trim()) {
      setError("Name the bill.");
      return;
    }
    if (amount == null) {
      setError("Enter the amount you are charged each cycle.");
      return;
    }
    const previous = draft.previous.trim() === "" ? null : parseDollars(draft.previous);
    const balance = draft.balance.trim() === "" ? null : parseDollars(draft.balance);
    if (draft.previous.trim() !== "" && previous == null) {
      setError("Previous amount is not a number.");
      return;
    }
    if (draft.balance.trim() !== "" && balance == null) {
      setError("Balance is not a number.");
      return;
    }
    const apr = draft.apr.trim() === "" ? null : Number(draft.apr);
    if (apr != null && (!Number.isFinite(apr) || apr < 0 || apr > 100)) {
      setError("APR should be a percent between 0 and 100.");
      return;
    }
    const bill: Bill = {
      id: draft.id || uid(),
      name: draft.name.trim(),
      category: draft.category,
      amountCents: amount,
      cycle: draft.cycle,
      previousAmountCents: previous,
      balanceCents: balance,
      aprPercent: apr,
      lastReviewed: draft.lastReviewed || null,
      renewsOn: draft.renewsOn || null,
      notes: draft.notes.trim(),
    };
    upsert(bill);
    setDraft(blankDraft());
    setError("");
  }

  return (
    <div className="py-6">
      {!profile ? <p className="mb-4 text-muted">You can add bills before the household form, but the plan gets sharper after take-home is in.</p> : null}
      <h2 className="text-3xl">{draft.id ? "Edit a bill" : "Add a bill"}</h2>
      <p className="mt-2 max-w-xl text-muted">
        Enter what you are charged. Groceries and transit belong here so the month is honest. Hearth will not tell you to eat less.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((item) => (
          <button
            key={item.name}
            type="button"
            className="btn btn-quiet"
            onClick={() => setDraft({ ...blankDraft(), name: item.name, category: item.category })}
          >
            Start {item.name.toLowerCase()}
          </button>
        ))}
      </div>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Name">
          <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Rent, Netflix, City electric" />
        </Field>
        <Field label="Category">
          <SelectInput
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as BillCategory })}
          >
            {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Amount" hint="The charge for one cycle, not a yearly guess.">
          <TextInput inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
        </Field>
        <Field label="Cycle">
          <SelectInput value={draft.cycle} onChange={(e) => setDraft({ ...draft, cycle: e.target.value as BillCycle })}>
            {Object.entries(CYCLE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <button type="button" className="btn btn-quiet" onClick={() => setDraft({ ...draft, more: !draft.more })}>
            {draft.more ? "Hide rate, balance, and dates" : "Add rate, balance, or dates"}
          </button>
        </div>
        {draft.more ? (
          <>
            <Field label="Previous amount" hint="Same cycle. Used only to notice a jump.">
              <TextInput inputMode="decimal" value={draft.previous} onChange={(e) => setDraft({ ...draft, previous: e.target.value })} />
            </Field>
            <Field label="Balance remaining" hint="Debts only.">
              <TextInput inputMode="decimal" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: e.target.value })} />
            </Field>
            <Field label="APR percent" hint="24.99 means 24.99%. Leave blank if this is not a debt.">
              <TextInput inputMode="decimal" value={draft.apr} onChange={(e) => setDraft({ ...draft, apr: e.target.value })} />
            </Field>
            <Field label="Last reviewed">
              <TextInput type="date" value={draft.lastReviewed} onChange={(e) => setDraft({ ...draft, lastReviewed: e.target.value })} />
            </Field>
            <Field label="Renews or ends">
              <TextInput type="date" value={draft.renewsOn} onChange={(e) => setDraft({ ...draft, renewsOn: e.target.value })} />
            </Field>
            <Field label="Note">
              <AreaInput value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </>
        ) : null}
        {error ? <p className="text-sm text-brass sm:col-span-2">{error}</p> : null}
        {duplicate ? (
          <p className="text-sm text-muted sm:col-span-2">A bill with this name is already on the ledger. Save only if it is a second one.</p>
        ) : null}
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" className="btn btn-ink">
            {draft.id ? "Save bill" : "Add bill"}
          </button>
          {draft.id ? (
            <button type="button" className="btn btn-quiet" onClick={() => setDraft(blankDraft())}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <Panel>
        <h2 className="text-2xl">Ledger</h2>
        {bills.length > 0 ? (
          <p className="mt-2 tabular-nums text-muted">{formatUSD(ledgerMonthly)} a month across {bills.length} {bills.length === 1 ? "bill" : "bills"}.</p>
        ) : null}
        {bills.length > 4 ? (
          <label className="mt-3 flex flex-col gap-1 text-sm">
            Find a bill
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="field-input" placeholder="Name" />
          </label>
        ) : null}
        {bills.length === 0 ? <p className="mt-3 text-muted">Nothing entered.</p> : null}
        {bills.length > 0 && shown.length === 0 ? <p className="mt-3 text-muted">Nothing matches that name.</p> : null}
        <ul className="mt-4 flex flex-col">
          {shown.map((bill) => (
            <li key={bill.id} className="flex flex-col gap-3 border-t border-line py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{bill.name}</p>
                <p className="text-sm text-muted">
                  {CATEGORY_LABEL[bill.category]} · {formatUSD(bill.amountCents)} {CYCLE_LABEL[bill.cycle].toLowerCase()} ·{" "}
                  <span className="tabular-nums">{formatUSD(monthlyCents(bill))} / month</span>
                  {bill.lastReviewed ? ` · reviewed ${bill.lastReviewed}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-quiet" onClick={() => markReviewed(bill.id)}>
                  Reviewed today
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setDraft(fromBill(bill))}>
                  Edit
                </button>
                {pendingRemove === bill.id ? (
                  <button
                    type="button"
                    className="btn btn-brass"
                    onClick={() => {
                      remove(bill.id);
                      setPendingRemove(null);
                      if (draft.id === bill.id) setDraft(blankDraft());
                    }}
                  >
                    Confirm remove
                  </button>
                ) : (
                  <button type="button" className="btn btn-quiet" onClick={() => setPendingRemove(bill.id)}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
