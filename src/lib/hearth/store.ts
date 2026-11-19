import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EXAMPLE_BILLS, EXAMPLE_PROFILE } from "./example.ts";
import { todayISO, uid } from "./money.ts";
import type { ActionRecord, ActionStatus, AuditEvent, Bill, Profile, Verification } from "./types.ts";

export type CaseData = {
  profile: Profile | null;
  bills: Bill[];
  actions: Record<string, ActionRecord>;
  verifications: Verification[];
  audit: AuditEvent[];
  fictional: boolean;
  /** Null means "use whatever is left after the bills." */
  debtExtraCents: number | null;
};

type Store = CaseData & {
  /** Local mark only. Stripe is the record of the charge. */
  fileMarked: boolean;
  setProfile: (profile: Profile, opts?: { fictional?: boolean }) => void;
  upsertBill: (bill: Bill) => void;
  removeBill: (id: string) => void;
  setAction: (
    findingId: string,
    patch: Partial<Pick<ActionRecord, "status" | "followUp" | "note">>,
  ) => void;
  addVerification: (row: Omit<Verification, "id">) => void;
  removeVerification: (id: string) => void;
  loadExample: () => void;
  replaceAll: (data: CaseData) => void;
  clearAll: () => void;
  markReviewed: (id: string) => void;
  setDebtExtra: (cents: number | null) => void;
  setFileMarked: (marked: boolean) => void;
};

const blank: CaseData = {
  profile: null,
  bills: [],
  actions: {},
  verifications: [],
  audit: [],
  fictional: false,
  debtExtraCents: null,
};

function stamp(kind: string, detail: string): AuditEvent {
  return { id: uid(), at: new Date().toISOString(), kind, detail };
}

function withAudit(current: AuditEvent[], event: AuditEvent): AuditEvent[] {
  return [event, ...current].slice(0, 200);
}

export const useHearth = create<Store>()(
  persist(
    (set, get) => ({
      ...blank,
      fileMarked: false,
      setProfile: (profile, opts) =>
        set({
          profile,
          fictional: opts?.fictional ?? false,
          audit: withAudit(get().audit, stamp("profile", "Household file updated from the form.")),
        }),
      upsertBill: (bill) => {
        const exists = get().bills.some((b) => b.id === bill.id);
        set({
          bills: exists ? get().bills.map((b) => (b.id === bill.id ? bill : b)) : [...get().bills, bill],
          audit: withAudit(
            get().audit,
            stamp(exists ? "bill-edit" : "bill-add", `${exists ? "Updated" : "Added"} ${bill.name}.`),
          ),
        });
      },
      removeBill: (id) => {
        const bill = get().bills.find((b) => b.id === id);
        set({
          bills: get().bills.filter((b) => b.id !== id),
          audit: withAudit(get().audit, stamp("bill-remove", `Removed ${bill?.name ?? "a bill"}.`)),
        });
      },
      setAction: (findingId, patch) => {
        const prev = get().actions[findingId];
        const next: ActionRecord = {
          findingId,
          status: patch.status ?? prev?.status ?? "open",
          followUp: patch.followUp === undefined ? (prev?.followUp ?? null) : patch.followUp,
          note: patch.note === undefined ? (prev?.note ?? "") : patch.note,
          updatedAt: todayISO(),
        };
        set({
          actions: { ...get().actions, [findingId]: next },
          audit: withAudit(
            get().audit,
            stamp("action", `${findingId} marked ${next.status}${next.followUp ? ` · follow up ${next.followUp}` : ""}.`),
          ),
        });
      },
      addVerification: (row) => {
        const item: Verification = { ...row, id: uid() };
        const delta = item.monthlyBeforeCents - item.monthlyAfterCents;
        set({
          verifications: [item, ...get().verifications],
          audit: withAudit(
            get().audit,
            stamp(
              "verify",
              `Verified ${item.label}: ${(delta / 100).toFixed(2)} dollars a month, confirmed ${item.confirmedOn}.`,
            ),
          ),
        });
      },
      removeVerification: (id) =>
        set({
          verifications: get().verifications.filter((v) => v.id !== id),
          audit: withAudit(get().audit, stamp("verify-remove", "Removed a verified row. The total changed.")),
        }),
      loadExample: () =>
        set({
          profile: EXAMPLE_PROFILE,
          bills: EXAMPLE_BILLS,
          actions: {},
          verifications: [],
          fictional: true,
          debtExtraCents: null,
          audit: withAudit(
            get().audit,
            stamp("example", "Loaded the fictional Hale household. These are not your numbers."),
          ),
        }),
      replaceAll: (data) =>
        set({
          ...blank,
          ...data,
          debtExtraCents: data.debtExtraCents ?? null,
          audit: withAudit(data.audit, stamp("import", "Imported a case file. Previous on-screen data was replaced.")),
        }),
      clearAll: () =>
        set({
          ...blank,
          audit: [stamp("clear", "Cleared the household file from this browser.")],
        }),
      markReviewed: (id) => {
        const bill = get().bills.find((b) => b.id === id);
        if (!bill) return;
        const next = { ...bill, lastReviewed: todayISO() };
        set({
          bills: get().bills.map((b) => (b.id === id ? next : b)),
          audit: withAudit(get().audit, stamp("bill-review", `Marked ${bill.name} reviewed on ${next.lastReviewed}.`)),
        });
      },
      setDebtExtra: (cents) =>
        set({
          debtExtraCents: cents,
          audit: withAudit(
            get().audit,
            stamp("debt-extra", cents == null ? "Debt extra reset to the full surplus." : "Debt extra payment changed."),
          ),
        }),
      setFileMarked: (marked) =>
        set({
          fileMarked: marked,
          audit: withAudit(
            get().audit,
            stamp(
              "file-mark",
              marked
                ? "Marked this browser as Hearth File. Stripe was not checked."
                : "Removed the Hearth File mark from this browser. The subscription was not canceled.",
            ),
          ),
        }),
    }),
    {
      name: "hearth-case-v1",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({
        profile: state.profile,
        bills: state.bills,
        actions: state.actions,
        verifications: state.verifications,
        audit: state.audit,
        fictional: state.fictional,
        debtExtraCents: state.debtExtraCents,
        fileMarked: state.fileMarked,
      }),
    },
  ),
);

export function actionStatus(actions: Record<string, ActionRecord>, findingId: string): ActionStatus {
  return actions[findingId]?.status ?? "open";
}
