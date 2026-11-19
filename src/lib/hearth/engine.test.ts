import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLE_BILLS, EXAMPLE_PROFILE } from "./example.ts";
import { analyze, ledgerGaps, monthlyCents, resolveExtra, simulateDebt, verifiedAnnualCents } from "./engine.ts";
import type { Bill, Profile } from "./types.ts";

const TODAY = "2026-11-18";

function profile(over: Partial<Profile> = {}): Profile {
  return {
    name: "Test",
    state: "IL",
    size: 1,
    childrenUnder5: 0,
    monthlyTakeHomeCents: 300_000,
    savingsCents: 0,
    housing: "rent",
    pregnantOrPostpartum: false,
    disability: false,
    age65Plus: false,
    veteran: false,
    recentJobLoss: false,
    hasStudentLoans: false,
    hasMedicalBills: false,
    ...over,
  };
}

function bill(over: Partial<Bill> & Pick<Bill, "id" | "name" | "category" | "amountCents">): Bill {
  return {
    cycle: "monthly",
    previousAmountCents: null,
    balanceCents: null,
    aprPercent: null,
    lastReviewed: null,
    renewsOn: null,
    notes: "",
    ...over,
  };
}

test("weekly bills become a monthly equivalent", () => {
  const cents = monthlyCents(
    bill({ id: "w", name: "Transit", category: "transport", amountCents: 2_500, cycle: "weekly" }),
  );
  assert.equal(cents, Math.round((2_500 * 52) / 12));
});

test("a shortfall is pinned and groceries are not a cut target", () => {
  const result = analyze(
    profile({ monthlyTakeHomeCents: 100_000 }),
    [
      bill({ id: "rent", name: "Rent", category: "housing", amountCents: 90_000 }),
      bill({ id: "food", name: "Groceries", category: "groceries", amountCents: 40_000 }),
    ],
    TODAY,
  );
  assert.equal(result.findings[0]?.id, "cashflow-deficit");
  assert.equal(
    result.findings.some((f) => /grocer/i.test(f.title) && /cut/i.test(f.title)),
    false,
  );
  assert.ok(result.monthlySurplusCents < 0);
});

test("SNAP is ask under the gross limit and unlikely above it", () => {
  const under = analyze(profile({ size: 1, monthlyTakeHomeCents: 150_000 }), [], TODAY);
  const over = analyze(profile({ size: 1, monthlyTakeHomeCents: 200_000 }), [], TODAY);
  assert.equal(under.programs.find((p) => p.id === "snap")?.status, "ask");
  assert.equal(over.programs.find((p) => p.id === "snap")?.status, "unlikely");
});

test("Alaska is not marked unlikely, and ACP stays closed", () => {
  const result = analyze(profile({ state: "AK", monthlyTakeHomeCents: 900_000, size: 1 }), [], TODAY);
  assert.notEqual(result.programs.find((p) => p.id === "snap")?.status, "unlikely");
  assert.equal(result.programs.find((p) => p.id === "acp")?.status, "closed");
});

test("the worked example finds the streaming overlap and refuses an insurance dollar estimate", () => {
  const result = analyze(EXAMPLE_PROFILE, EXAMPLE_BILLS, TODAY);
  assert.ok(result.findings.some((f) => f.id === "dup-video"));
  const insurance = result.findings.find((f) => f.id === "insurance-review");
  assert.ok(insurance);
  assert.equal(insurance.estimateLowCents, null);
  assert.equal(insurance.estimateHighCents, null);
  assert.ok(result.monthlySurplusCents > 0);
  assert.equal(result.programs.find((p) => p.id === "student")?.status, "ask");
});

test("avalanche interest is below snowball, and a starved minimum does not pretend to end", () => {
  const lines = [
    { id: "card", name: "Card", balanceCents: 200_000, aprPercent: 25, minimumCents: 4_000 },
    { id: "loan", name: "Loan", balanceCents: 50_000, aprPercent: 6, minimumCents: 2_500 },
  ];
  const avalanche = simulateDebt(lines, "avalanche", 10_000);
  const snowball = simulateDebt(lines, "snowball", 10_000);
  const minimums = simulateDebt(lines, "minimums", 10_000);
  assert.equal(avalanche.unbounded, false);
  assert.equal(snowball.unbounded, false);
  assert.ok((avalanche.interestCents ?? 0) < (snowball.interestCents ?? 0));
  const covered = [
    { id: "card", name: "Card", balanceCents: 200_000, aprPercent: 12, minimumCents: 5_000 },
    { id: "loan", name: "Loan", balanceCents: 80_000, aprPercent: 6, minimumCents: 2_000 },
  ];
  const fast = simulateDebt(covered, "avalanche", 8_000);
  const slow = simulateDebt(covered, "minimums", 0);
  assert.equal(fast.unbounded, false);
  assert.equal(slow.unbounded, false);
  assert.ok((fast.months ?? 999) < (slow.months ?? 0));

  const trapped = simulateDebt(
    [{ id: "x", name: "Card", balanceCents: 500_000, aprPercent: 24, minimumCents: 2_500 }],
    "minimums",
    0,
  );
  assert.equal(trapped.unbounded, true);
  assert.equal(trapped.interestCents, null);
});

test("extra debt payments cannot exceed the surplus, and a thin ledger says so", () => {
  assert.deepEqual(resolveExtra(10_000, null), { extraCents: 10_000, clamped: false, partial: false });
  assert.deepEqual(resolveExtra(10_000, 4_000), { extraCents: 4_000, clamped: false, partial: true });
  assert.deepEqual(resolveExtra(10_000, 50_000), { extraCents: 10_000, clamped: true, partial: false });
  assert.deepEqual(resolveExtra(-500, 100), { extraCents: 0, clamped: true, partial: false });
  const gaps = ledgerGaps([
    bill({ id: "food", name: "Groceries", category: "groceries", amountCents: 1 }),
  ]);
  assert.equal(gaps.some((g) => /Housing/.test(g)), true);
  assert.equal(gaps.some((g) => /Groceries/.test(g)), false);
});

test("verified savings are the confirmed delta only", () => {
  assert.equal(
    verifiedAnnualCents([
      { monthlyBeforeCents: 9_500, monthlyAfterCents: 7_000 },
      { monthlyBeforeCents: 1_200, monthlyAfterCents: 0 },
    ]),
    (2_500 + 1_200) * 12,
  );
});
