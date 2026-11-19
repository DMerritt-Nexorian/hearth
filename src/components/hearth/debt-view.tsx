import { useState } from "react";
import { analyze, buildDebtScenarios, resolveExtra } from "@/lib/hearth/engine";
import { centsToInput, formatUSD, parseDollars } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import { Panel, TextInput } from "./ui";

export function DebtView() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  const storedExtra = useHearth((s) => s.debtExtraCents);
  const setDebtExtra = useHearth((s) => s.setDebtExtra);
  const [raw, setRaw] = useState(storedExtra == null ? "" : centsToInput(storedExtra));
  const [extraError, setExtraError] = useState("");
  if (!profile) {
    return (
      <div className="py-6">
        <h2 className="text-3xl">Debt math needs the household file</h2>
        <p className="mt-3 text-muted">The extra payment is whatever is left after the bills. Without take-home, that number would be invented.</p>
      </div>
    );
  }
  const analysis = analyze(profile, bills);
  const choice = resolveExtra(analysis.monthlySurplusCents, storedExtra);
  const debt = buildDebtScenarios(bills, analysis.monthlySurplusCents, storedExtra);
  const debts = bills.filter((b) => b.category === "debt");
  return (
    <div className="py-6">
      <h2 className="text-3xl">Two orders, one pile of money</h2>
      <p className="mt-2 max-w-xl">
        Avalanche puts extra principal on the highest rate. Snowball puts it on the smallest balance. Minimums do not
        roll a finished payment onto the next debt. None of these is a lender, a settlement company, or a refinance.
      </p>
      <p className="mt-4 text-sm text-muted">
        Surplus after every bill, including groceries: {formatUSD(Math.max(0, analysis.monthlySurplusCents))} a month.
        The model is using {formatUSD(debt.extraCents)}.
        {choice.clamped ? " The larger number was cut down. Hearth will not invent the rest." : ""}
        {choice.partial ? " The rest of the surplus is left out of the payoff on purpose." : ""}
      </p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = raw.trim() === "" ? null : parseDollars(raw);
          if (raw.trim() !== "" && parsed == null) {
            setExtraError("Enter a dollar amount, or use the full surplus.");
            return;
          }
          setExtraError("");
          setDebtExtra(parsed);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Extra you will actually send
          <TextInput
            inputMode="decimal"
            value={raw}
            placeholder={centsToInput(Math.max(0, analysis.monthlySurplusCents))}
            onChange={(e) => {
              setRaw(e.target.value);
              setExtraError("");
            }}
          />
        </label>
        <button type="submit" className="btn btn-ink">
          Use this amount
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setRaw("");
            setExtraError("");
            setDebtExtra(null);
          }}
        >
          Use the full surplus
        </button>
      </form>
      {extraError ? <p className="mt-2 text-sm text-brass">{extraError}</p> : null}
      {debts.length === 0 ? (
        <p className="mt-6">
          Add a bill in the Debt payment category with a balance and an APR. The payment amount is the minimum, not the balance.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {debts.map((d) => (
            <li key={d.id} className="text-sm text-muted">
              {d.name}
              {d.balanceCents != null ? ` · balance ${formatUSD(d.balanceCents)}` : " · no balance"}
              {d.aprPercent != null ? ` · ${d.aprPercent}% APR` : " · no APR"}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {debt.scenarios.map((scene) => (
          <article key={scene.name} className="border border-line bg-sheet p-4">
            <h3 className="text-2xl">{scene.name}</h3>
            <p className="mt-3 font-display text-3xl tabular-nums">
              {scene.unbounded || scene.months == null ? "Does not clear" : `${scene.months} mo`}
            </p>
            <p className="mt-1 tabular-nums text-muted">
              {scene.interestCents == null ? "Interest not stated — the balance does not end in 40 years." : `${formatUSD(scene.interestCents)} interest`}
            </p>
            {scene.order.length > 0 ? (
              <p className="mt-3 text-sm">Order: {scene.order.join(" → ")}</p>
            ) : null}
            <p className="mt-3 text-sm text-muted">{scene.note}</p>
          </article>
        ))}
      </div>
      <Panel>
        <h2 className="text-2xl">If a collector is involved</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Ask for written validation before you pay a debt you do not recognize.</li>
          <li>Do not pay a company that charges a fee up front to settle or to "fix" your credit.</li>
          <li>
            Federal student loans stay on{" "}
            <a className="underline decoration-brass underline-offset-4" href="https://studentaid.gov" target="_blank" rel="noreferrer">
              studentaid.gov
            </a>
            . A private refinance can remove federal options.
          </li>
          <li>
            Medical bills: get the itemized bill and the provider's financial-assistance policy before you move the balance onto a card.
          </li>
        </ul>
        <p className="mt-4 text-sm">
          <a className="underline decoration-brass underline-offset-4" href="https://www.consumerfinance.gov" target="_blank" rel="noreferrer">
            CFPB
          </a>
        </p>
      </Panel>
    </div>
  );
}
