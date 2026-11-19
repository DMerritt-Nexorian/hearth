import { analyze } from "@/lib/hearth/engine";
import { formatUSD } from "@/lib/hearth/money";
import { useHearth } from "@/lib/hearth/store";
import { Panel } from "./ui";

export function DebtView() {
  const profile = useHearth((s) => s.profile);
  const bills = useHearth((s) => s.bills);
  if (!profile) {
    return (
      <div className="py-6">
        <h2 className="text-3xl">Debt math needs the household file</h2>
        <p className="mt-3 text-muted">The extra payment is whatever is left after the bills. Without take-home, that number would be invented.</p>
      </div>
    );
  }
  const analysis = analyze(profile, bills);
  const debts = bills.filter((b) => b.category === "debt");
  return (
    <div className="py-6">
      <h2 className="text-3xl">Two orders, one pile of money</h2>
      <p className="mt-2 max-w-xl">
        Avalanche puts extra principal on the highest rate. Snowball puts it on the smallest balance. Minimums do not
        roll a finished payment onto the next debt. None of these is a lender, a settlement company, or a refinance.
      </p>
      <p className="mt-4 text-sm text-muted">
        Extra payment used in the model: {formatUSD(analysis.extraPaymentCents)} a month
        {analysis.extraPaymentCents === 0 ? " — the list already uses the whole take-home." : " — the surplus after every bill, including groceries."}
      </p>
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
        {analysis.debts.map((scene) => (
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
