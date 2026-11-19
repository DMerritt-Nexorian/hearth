import { useState } from "react";
import { briefHtml, downloadText, parseCaseFile, serializeCase } from "@/lib/hearth/case-file";
import { KB_AS_OF } from "@/lib/hearth/knowledge";
import { useHearth } from "@/lib/hearth/store";
import type { CaseData } from "@/lib/hearth/store";
import { Panel } from "./ui";

export function RecordView() {
  const data = useHearth((s) => ({
    profile: s.profile,
    bills: s.bills,
    actions: s.actions,
    verifications: s.verifications,
    audit: s.audit,
    fictional: s.fictional,
    debtExtraCents: s.debtExtraCents,
  }));
  const replaceAll = useHearth((s) => s.replaceAll);
  const clearAll = useHearth((s) => s.clearAll);
  const loadExample = useHearth((s) => s.loadExample);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, setPending] = useState<{ name: string; data: CaseData } | null>(null);

  function exportJson() {
    downloadText("hearth-case.json", serializeCase(data), "application/json");
    setMessage("Downloaded hearth-case.json. It contains everything you typed.");
  }

  function exportHtml() {
    downloadText("hearth-brief.html", briefHtml(data), "text/html");
    setMessage("Downloaded a single HTML brief. Anyone can open it without this site.");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseCaseFile(JSON.parse(await file.text()));
      if (!parsed) {
        setMessage("That file is not a Hearth case, version 1.");
        return;
      }
      setPending({ name: file.name, data: parsed });
      setMessage(`${file.name} is ready. Confirm before it replaces the file in this browser.`);
    } catch {
      setMessage("Could not read that file as JSON.");
    }
  }

  return (
    <div className="py-6">
      <h2 className="text-3xl">The file, and the rules around it</h2>
      <p className="mt-2 max-w-xl">
        Download is the package. JSON is the working copy. The HTML brief is one page someone else can read without an account.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" className="btn btn-ink" onClick={exportJson}>
          Download case JSON
        </button>
        <button type="button" className="btn btn-quiet" onClick={exportHtml}>
          Download one-page brief
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => window.print()}>
          Print
        </button>
        <label className="btn btn-quiet">
          Import case JSON
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {pending ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-brass"
            onClick={() => {
              replaceAll(pending.data);
              setMessage(`Imported ${pending.name}. The previous file in this browser was replaced.`);
              setPending(null);
            }}
          >
            Confirm import
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setPending(null)}>
            Keep the current file
          </button>
        </div>
      ) : null}

      <Panel>
        <h2 className="text-2xl">What this is</h2>
        <div className="mt-3 flex max-w-2xl flex-col gap-3">
          <p>
            Hearth is the first cut of a household economic recovery engine. It turns a ledger into a short list of
            things worth doing, shows the math, and refuses to call an estimate a saving.
          </p>
          <p>
            Knowledge date {KB_AS_OF}. Assistance figures are the 2026 poverty guidelines and the USDA SNAP gross limits
            for October 2026 through September 2027, 48 states and DC. State offices can be stricter, slower, or out of
            funds. A federal stopgap reported in the fall of 2026 ran only into December.
          </p>
          <p>The rank is the midpoint of an annual range, times confidence, times a risk discount, divided by time. A shortfall is pinned to the top. Program screens are not given a fake dollar value.</p>
        </div>
      </Panel>
      <Panel>
        <h2 className="text-2xl">What was left out on purpose</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>No bank connection. A leaked token is worse than a typed bill.</li>
          <li>No chatbot. A fluent paragraph is not a source.</li>
          <li>No applications filed for you, and no money moved.</li>
          <li>No lending, settlement, or insurance referrals, and no commissions.</li>
          <li>No job search, medical advice, or contractor marketplace. Those are different products with different duties.</li>
          <li>Groceries are in the cash-flow math and out of the "cut this" list.</li>
        </ul>
      </Panel>
      <Panel>
        <h2 className="text-2xl">Where it lives</h2>
        <p className="mt-3 max-w-2xl">
          The case stays in this browser under the key hearth-case-v1. Clearing site data clears the file. There is no
          account, because an account would put household numbers on a server you did not ask for. Import the JSON on
          another device if you want a copy there.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-quiet" onClick={() => loadExample()}>
            Load fictional example
          </button>
          {confirmClear ? (
            <button
              type="button"
              className="btn btn-brass"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
                setMessage("Cleared from this browser. A downloaded JSON is unaffected.");
              }}
            >
              Confirm clear
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmClear(true)}>
              Clear this browser
            </button>
          )}
        </div>
      </Panel>
      <Panel>
        <h2 className="text-2xl">Record</h2>
        {data.audit.length === 0 ? <p className="mt-3 text-muted">Nothing has been written yet.</p> : null}
        <ol className="mt-3 flex flex-col">
          {data.audit.map((event) => (
            <li key={event.id} className="border-t border-line py-3 text-sm">
              <span className="text-muted">{event.at.slice(0, 16).replace("T", " ")} · {event.kind}</span>
              <span className="block">{event.detail}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
