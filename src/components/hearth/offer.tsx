import { useState } from "react";
import { HEARTH_FILE } from "@/lib/hearth/billing";
import { useHearth } from "@/lib/hearth/store";
import { Panel } from "./ui";

export function FileOffer({ compact = false }: { compact?: boolean }) {
  const marked = useHearth((s) => s.fileMarked);
  const setFileMarked = useHearth((s) => s.setFileMarked);
  const [confirm, setConfirm] = useState(false);
  if (compact && marked) return null;

  if (marked) {
    return (
      <Panel>
        <h2 className="text-2xl">This browser is marked</h2>
        <p className="mt-2 max-w-xl">
          Hearth File is unlocked here. Stripe was not asked. The receipt is the record of the charge. Clearing site data
          removes the mark and does not cancel the subscription.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn btn-quiet" href={HEARTH_FILE.portalUrl} target="_blank" rel="noreferrer">
            Cancel or change card
          </a>
          {confirm ? (
            <button
              type="button"
              className="btn btn-brass"
              onClick={() => {
                setFileMarked(false);
                setConfirm(false);
              }}
            >
              Confirm remove mark
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirm(true)}>
              Remove the mark
            </button>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="text-2xl">Hearth File</h2>
      <p className="mt-2 max-w-xl">
        The ledger, the month, and every assistance screen stay free. The paid file is the part you keep working:
        status, follow-ups, debt math, the proof log, and the download.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="border border-ink bg-sheet p-4">
          <p className="text-sm text-brass">If the cash is there</p>
          <p className="font-display text-3xl tabular-nums">$29 a year</p>
          <p className="mt-1 text-sm text-muted">$19 less than paying $4 each month. This is the price to take.</p>
          <a className="btn btn-ink mt-4" href={HEARTH_FILE.annualUrl} target="_blank" rel="noreferrer">
            Subscribe yearly
          </a>
        </div>
        <div className="border border-line bg-sheet p-4">
          <p className="text-sm text-muted">If a year will not fit</p>
          <p className="font-display text-3xl tabular-nums">$4 a month</p>
          <p className="mt-1 text-sm text-muted">$48 over a year. Same file. Cancel at the end of the period you paid.</p>
          <a className="btn btn-quiet mt-4" href={HEARTH_FILE.monthlyUrl} target="_blank" rel="noreferrer">
            Subscribe monthly
          </a>
        </div>
      </div>
      {compact ? null : (
        <div className="mt-4 flex max-w-xl flex-col gap-2 text-sm text-muted">
          <p>Tax is on top of that price, and only where this Stripe account has a registration. It has none today, so tax is not added yet.</p>
          <p>
            After you pay, come back and mark this browser. The mark does not check Stripe. It only unlocks this device.
            Promotion codes work on the checkout page.
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {confirm ? (
          <button
            type="button"
            className="btn btn-brass"
            onClick={() => {
              setFileMarked(true);
              setConfirm(false);
            }}
          >
            Confirm mark
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirm(true)}>
            Mark this browser
          </button>
        )}
        <a className="btn btn-quiet" href={HEARTH_FILE.portalUrl} target="_blank" rel="noreferrer">
          Cancel or change card
        </a>
      </div>
    </Panel>
  );
}
