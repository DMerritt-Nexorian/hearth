import {
  FUNDING_NOTE,
  HEARTH_HEURISTIC,
  KB_AS_OF,
  SRC,
  SUBSCRIPTION_CLUSTERS,
  fplAnnual48,
  percentOfFplMonthlyCents,
  snapGrossMonthlyCents,
} from "./knowledge.ts";
import { daysUntil, formatUSD, todayISO } from "./money.ts";
import type {
  Analysis,
  Bill,
  BillCategory,
  Confidence,
  DebtScenario,
  Finding,
  Profile,
  ProgramMatch,
  ProgramStatus,
  Risk,
  SourceRef,
} from "./types.ts";

const CYCLE_PER_YEAR: Record<Bill["cycle"], number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function monthlyCents(bill: Bill): number {
  return Math.round((bill.amountCents * CYCLE_PER_YEAR[bill.cycle]) / 12);
}

export function annualCents(bill: Bill): number {
  return bill.amountCents * CYCLE_PER_YEAR[bill.cycle];
}

type IncomeRead = "ask" | "unlikely" | "unknown";

/**
 * Take-home is not gross. If take-home already exceeds a gross limit, gross
 * cannot be under it. If take-home is under the limit, gross might still be over it.
 * Alaska and Hawaii are unknown: their poverty guidelines are higher than the 48-state table.
 */
export function incomeRead(profile: Profile, limitMonthlyCents: number): IncomeRead {
  if (profile.state === "AK" || profile.state === "HI") return "unknown";
  if (profile.monthlyTakeHomeCents <= 0) return "unknown";
  if (profile.monthlyTakeHomeCents > limitMonthlyCents) return "unlikely";
  return "ask";
}

function finding(partial: Finding): Finding {
  return partial;
}

function priorityScore(f: Finding): number {
  const low = f.estimateLowCents ?? 0;
  const high = f.estimateHighCents ?? 0;
  const mid = (low + high) / 2;
  const conf = f.confidence === "high" ? 1 : f.confidence === "medium" ? 0.6 : 0.35;
  const risk = f.risk === "high" ? 0.4 : f.risk === "medium" ? 0.75 : 1;
  const time = 1 / (1 + f.hours / 2);
  return mid * conf * risk * time;
}

export function rankFindings(findings: Finding[]): Finding[] {
  const pinned = findings.filter((f) => f.id === "cashflow-deficit");
  const rest = findings
    .filter((f) => f.id !== "cashflow-deficit")
    .slice()
    .sort((a, b) => priorityScore(b) - priorityScore(a) || a.title.localeCompare(b.title));
  return [...pinned, ...rest];
}

function billsIn(bills: Bill[], category: BillCategory): Bill[] {
  return bills.filter((b) => b.category === category);
}

function sumMonthly(bills: Bill[]): number {
  return bills.reduce((s, b) => s + monthlyCents(b), 0);
}

function nameHits(name: string, needle: string): boolean {
  return name.toLowerCase().includes(needle);
}

export function buildFindings(profile: Profile, bills: Bill[], today: string): Finding[] {
  const out: Finding[] = [];
  const income = profile.monthlyTakeHomeCents;
  const obligations = sumMonthly(bills);
  const surplus = income - obligations;

  if (income > 0 && surplus < 0) {
    const largest = bills
      .slice()
      .sort((a, b) => monthlyCents(b) - monthlyCents(a))
      .slice(0, 3)
      .map((b) => b.name)
      .join(", ");
    out.push(
      finding({
        id: "cashflow-deficit",
        title: "The month does not cover the bills on this list",
        detail: `Take-home is short by ${formatUSD(Math.abs(surplus))} a month against the bills entered. Largest items: ${largest || "none listed"}. This is a gap, not a savings estimate. Do not start by cutting food.`,
        domain: "cashflow",
        estimateLowCents: null,
        estimateHighCents: null,
        hours: 2,
        confidence: "high",
        risk: "low",
        sources: [SRC.cfpb],
        steps: [
          "Confirm every bill is still being charged. Remove anything already canceled.",
          "Work the plan from the top. Skip any step that needs money you do not have.",
          "Call 211 if a shutoff, eviction, or empty kitchen is close. That call is free.",
        ],
      }),
    );
  }

  const housing = sumMonthly(billsIn(bills, "housing"));
  if (income > 0 && housing / income > 0.3) {
    out.push(
      finding({
        id: "housing-burden",
        title: "Housing is more than 30% of take-home",
        detail:
          "The 30% figure is a stress marker used by housing agencies, not a rule that you can spend your way under. Hearth will not invent a cheaper rent. A HUD-approved counselor can look at the actual lease, fees, and local aid without selling you a loan.",
        domain: "admin",
        estimateLowCents: null,
        estimateHighCents: null,
        hours: 2,
        confidence: "high",
        risk: "low",
        sources: [SRC.hud],
        steps: [
          "Write down rent or mortgage, utilities included, and any late fees from the last three months.",
          "Search HUD for a housing counseling agency in your state. Ask if the session is free.",
          "Do not pay an upfront fee to a person who promises to stop an eviction.",
        ],
      }),
    );
  }

  for (const bill of bills) {
    if (bill.previousAmountCents != null && bill.amountCents > Math.round(bill.previousAmountCents * 1.05)) {
      const deltaAnnual = (annualCents(bill) - bill.previousAmountCents * CYCLE_PER_YEAR[bill.cycle]);
      out.push(
        finding({
          id: `jump-${bill.id}`,
          title: `${bill.name} jumped`,
          detail:
            "The new amount is more than 5% above the previous amount you entered. The range below is what a year costs if the bill stayed at the old price. That is a hypothesis until the company puts a reason in writing.",
          domain: "bill",
          estimateLowCents: 0,
          estimateHighCents: Math.max(0, deltaAnnual),
          hours: 1,
          confidence: "low",
          risk: "low",
          sources: [HEARTH_HEURISTIC],
          steps: [
            "Ask for an itemized explanation. Usage, rate, tax, and fees are different problems.",
            "If the explanation is wrong, dispute it in writing and keep the reply.",
            "Only record a saving under Verify after a later bill actually drops.",
          ],
          billId: bill.id,
        }),
      );
    }

    if (bill.renewsOn) {
      const days = daysUntil(bill.renewsOn, today);
      if (days != null && days >= 0 && days <= 45) {
        out.push(
          finding({
            id: `renew-${bill.id}`,
            title: `${bill.name} renews within ${days} days`,
            detail:
              "Contracts are cheapest to change before they renew. After the date, you may owe a fee or another term. No saving is estimated, because the alternative price is unknown.",
            domain: "bill",
            estimateLowCents: null,
            estimateHighCents: null,
            hours: 1,
            confidence: "high",
            risk: "medium",
            sources: [SRC.cfpb],
            steps: [
              "Read the cancellation window on the contract, not a forum summary.",
              "Get any new offer in writing before you cancel the old one.",
              "Put the decision date on this action so it does not pass quietly.",
            ],
            billId: bill.id,
          }),
        );
      }
    }
  }

  const internet = billsIn(bills, "internet").filter((b) => monthlyCents(b) > 7_500);
  if (internet.length > 0) {
    out.push(
      finding({
        id: "internet-rate",
        title: "Internet is above $75 a month",
        detail:
          "Many households pay a promotional rate that expired. A retention offer is common and not guaranteed. The range is $10–$20 a month, which is a Hearth heuristic, not a survey of your ZIP code. Regulated areas may have only one wired provider.",
        domain: "bill",
        estimateLowCents: 10_00 * 12,
        estimateHighCents: 20_00 * 12,
        hours: 1,
        confidence: "low",
        risk: "low",
        sources: [HEARTH_HEURISTIC, SRC.lifeline],
        steps: [
          "Call and ask for the retention or loyalty desk. Write down the offer, the term, and the price after the term.",
          "Check Lifeline separately if the income screen says to ask. Do not confuse it with the ended Affordable Connectivity Program.",
          "If you accept a change, record the old and new monthly amount under Verify.",
        ],
      }),
    );
  }

  const phones = billsIn(bills, "phone").filter((b) => monthlyCents(b) > 10_000);
  if (phones.length > 0) {
    out.push(
      finding({
        id: "phone-rate",
        title: "The phone bill is above $100 a month",
        detail:
          "A lower prepaid or a smaller data plan sometimes covers the same use. Sometimes it does not — a work line, a device payment, or rural coverage can make a cheap plan a bad trade. The $15–$30 range is illustrative.",
        domain: "bill",
        estimateLowCents: 15_00 * 12,
        estimateHighCents: 30_00 * 12,
        hours: 1.5,
        confidence: "low",
        risk: "medium",
        sources: [HEARTH_HEURISTIC, SRC.fccLifeline],
        steps: [
          "Separate service from device payments. A phone installment is not a plan you can 'optimize' away.",
          "Ask what it costs to keep the number and leave.",
          "Do not switch until the new coverage is confirmed at home.",
        ],
      }),
    );
  }

  const subs = billsIn(bills, "subscription");
  const subMonthly = sumMonthly(subs);
  if (subMonthly > 2_000) {
    out.push(
      finding({
        id: "subscriptions",
        title: "Subscriptions add up",
        detail: `${subs.map((s) => s.name).join(", ")} come to more than $20 a month. Hearth will not tell you which ones you use. The high end of the range is half of the annual total — only if you cancel ones you have already confirmed are unused. The low end is zero.`,
        domain: "bill",
        estimateLowCents: 0,
        estimateHighCents: Math.round(sumMonthly(subs) * 12 * 0.5),
        hours: 0.5,
        confidence: "low",
        risk: "low",
        sources: [HEARTH_HEURISTIC],
        steps: [
          "For each subscription, write yes or no: used in the last 30 days.",
          "Cancel only the nos. Watch the next statement.",
          "Record the confirmed drop under Verify. Ignore the rest of the range.",
        ],
      }),
    );
  }

  for (const cluster of SUBSCRIPTION_CLUSTERS) {
    const hits = subs.filter((s) => cluster.needles.some((n) => nameHits(s.name, n)));
    if (hits.length >= 2) {
      const cheapest = hits.reduce((a, b) => (monthlyCents(a) < monthlyCents(b) ? a : b));
      out.push(
        finding({
          id: `dup-${cluster.id}`,
          title: `More than one ${cluster.label} service`,
          detail: `${hits.map((h) => h.name).join(" and ")} overlap. Canceling the cheaper one is the cautious illustration. You may need both. The estimate stays at zero until you decide.`,
          domain: "bill",
          estimateLowCents: 0,
          estimateHighCents: annualCents(cheapest),
          hours: 0.5,
          confidence: "medium",
          risk: "low",
          sources: [HEARTH_HEURISTIC],
          steps: [
            "Pick the one you would keep if you had to pay both in cash this week.",
            "Cancel the other only if the last month of use was zero.",
            "Verify the refund or the final charge before recording a saving.",
          ],
        }),
      );
    }
  }

  const staleInsurance = billsIn(bills, "insurance").filter((b) => {
    if (!b.lastReviewed) return true;
    const days = daysUntil(b.lastReviewed, today);
    return days != null && days < -365;
  });
  if (staleInsurance.length > 0) {
    out.push(
      finding({
        id: "insurance-review",
        title: "Insurance has not been reviewed in a year",
        detail: `${staleInsurance.map((b) => b.name).join(", ")} ${staleInsurance.length === 1 ? "has" : "have"} no review date inside the last year. A cheaper premium can be worse coverage. No dollar estimate is attached, on purpose.`,
        domain: "admin",
        estimateLowCents: null,
        estimateHighCents: null,
        hours: 3,
        confidence: "medium",
        risk: "high",
        sources: [SRC.cfpb],
        steps: [
          "Pull the declarations page: limits, deductibles, exclusions, and the renewal price.",
          "Compare those four, not the monthly draft alone.",
          "Use your state insurance department if a claim was underpaid. Do not buy a policy from an unsolicited caller.",
        ],
      }),
    );
  }

  const fees = billsIn(bills, "banking").filter((b) => monthlyCents(b) > 0);
  if (fees.length > 0) {
    const annual = fees.reduce((s, b) => s + annualCents(b), 0);
    out.push(
      finding({
        id: "bank-fees",
        title: "Bank fees are a bill you can ask to end",
        detail:
          "Overdraft, monthly maintenance, and paper-statement fees are often waivable, and often not. The high end assumes the bank waives every fee you listed. The low end assumes they refuse. Ask once, in the app or at a branch, and keep the answer.",
        domain: "bill",
        estimateLowCents: 0,
        estimateHighCents: annual,
        hours: 0.5,
        confidence: "medium",
        risk: "low",
        sources: [SRC.cfpb],
        steps: [
          "Name the fee and the month it posted.",
          "Ask for a waiver and for a no-monthly-fee account if you qualify.",
          "If they agree, record the next statement under Verify. If they refuse, skip this action.",
        ],
      }),
    );
  }

  const utilities = bills.filter((b) => b.category === "electric" || b.category === "gas" || b.category === "water");
  const heavyUtility = utilities.find((b) => monthlyCents(b) >= 20_000);
  if (heavyUtility) {
    out.push(
      finding({
        id: "utility-help",
        title: "A utility bill is large enough to ask about help, not a new provider",
        detail: `${heavyUtility.name} is at least $200 a month. Electric and gas service is often a monopoly. Shopping is the wrong first move. Payment plans, medical shutoff rules, weatherization, and LIHEAP are state programs with their own rules. No saving is estimated.`,
        domain: "admin",
        estimateLowCents: null,
        estimateHighCents: null,
        hours: 1.5,
        confidence: "medium",
        risk: "low",
        sources: [SRC.liheap, SRC.energy],
        steps: [
          "Ask the utility for a level payment plan and a copy of the shutoff policy. Get both in writing.",
          "If the income screen marks LIHEAP as worth asking, contact the state office. Never pay a fee to apply.",
          "Treat a sudden spike as a meter or rate question first. See the jump finding if you entered a previous amount.",
        ],
      }),
    );
  }

  for (const bill of billsIn(bills, "debt")) {
    if (bill.balanceCents == null || bill.aprPercent == null || bill.balanceCents <= 0 || bill.aprPercent <= 0) continue;
    const yearInterest = Math.round(bill.balanceCents * (bill.aprPercent / 100));
    const monthlyRate = bill.aprPercent / 100 / 12;
    const interestDue = Math.round(bill.balanceCents * monthlyRate);
    const min = monthlyCents(bill);
    const grows = min < interestDue;
    out.push(
      finding({
        id: `interest-${bill.id}`,
        title: grows
          ? `${bill.name} grows if you pay only the minimum`
          : `${bill.name} costs about ${formatUSD(yearInterest)} of interest in a still year`,
        detail: grows
          ? `A month of interest at the stated rate is ${formatUSD(interestDue)}. The payment on this list is ${formatUSD(min)}. The balance will not fall on minimums. This is a cost warning, not a saving, and it assumes the balance and rate stay still.`
          : `If the balance stayed at the amount you entered, a year of interest at the stated APR is about ${formatUSD(yearInterest)}. That number is a cost, not money Hearth saved. Paying extra principal is the lever. A new loan is not recommended here.`,
        domain: "debt",
        estimateLowCents: null,
        estimateHighCents: null,
        hours: 1,
        confidence: "high",
        risk: "medium",
        sources: [SRC.cfpb, SRC.student],
        steps: [
          grows
            ? "Call the creditor and ask for a hardship plan in writing. Do not pay a debt-settlement company first."
            : "On the Debt page, compare avalanche and snowball using only money left after the bills.",
          "If this is a medical bill, ask the provider for financial assistance before you put it on a card.",
          "Federal student loans are handled on studentaid.gov. Ignore refinance ads until you know what you would give up.",
        ],
        billId: bill.id,
      }),
    );
  }

  return rankFindings(out);
}

type DebtLine = {
  id: string;
  name: string;
  balanceCents: number;
  aprPercent: number;
  minimumCents: number;
};

export function debtLines(bills: Bill[]): DebtLine[] {
  return bills
    .filter(
      (b): b is Bill & { balanceCents: number; aprPercent: number } =>
        b.category === "debt" && b.balanceCents != null && b.aprPercent != null && b.balanceCents > 0,
    )
    .map((b) => ({
      id: b.id,
      name: b.name,
      balanceCents: b.balanceCents,
      aprPercent: b.aprPercent,
      minimumCents: Math.max(0, monthlyCents(b)),
    }));
}

/**
 * Month-by-month payoff. Interest accrues, then minimums are paid, then extra
 * goes to the target. Paid-off minimums roll into the extra the next month.
 * Stops at 480 months. Unbounded if a balance remains, including when a
 * minimum does not cover interest and extra cannot close the gap.
 */
export function simulateDebt(
  lines: DebtLine[],
  strategy: "minimums" | "avalanche" | "snowball",
  extraCents: number,
): { months: number | null; interestCents: number | null; unbounded: boolean; order: string[] } {
  const debts = lines.map((l) => ({ ...l }));
  const orderNames = debts
    .slice()
    .sort((a, b) => {
      if (strategy === "snowball") return a.balanceCents - b.balanceCents || b.aprPercent - a.aprPercent;
      if (strategy === "avalanche") return b.aprPercent - a.aprPercent || b.balanceCents - a.balanceCents;
      return b.aprPercent - a.aprPercent;
    })
    .map((d) => d.name);

  if (debts.length === 0) {
    return { months: 0, interestCents: 0, unbounded: false, order: [] };
  }

  let interest = 0;
  let extra = strategy === "minimums" ? 0 : Math.max(0, extraCents);
  for (let month = 1; month <= 480; month += 1) {
    for (const d of debts) {
      if (d.balanceCents <= 0) continue;
      const charge = Math.round(d.balanceCents * (d.aprPercent / 100 / 12));
      d.balanceCents += charge;
      interest += charge;
    }
    for (const d of debts) {
      if (d.balanceCents <= 0) continue;
      const pay = Math.min(d.balanceCents, d.minimumCents);
      d.balanceCents -= pay;
    }
    let pool = extra;
    const living = debts.filter((d) => d.balanceCents > 0);
    const targets =
      strategy === "snowball"
        ? living.slice().sort((a, b) => a.balanceCents - b.balanceCents)
        : living.slice().sort((a, b) => b.aprPercent - a.aprPercent);
    for (const d of targets) {
      if (pool <= 0) break;
      const pay = Math.min(d.balanceCents, pool);
      d.balanceCents -= pay;
      pool -= pay;
    }
    const freed =
      strategy === "minimums"
        ? 0
        : debts.filter((d) => d.balanceCents <= 0).reduce((s, d) => s + d.minimumCents, 0);
    extra = (strategy === "minimums" ? 0 : Math.max(0, extraCents)) + freed;
    if (debts.every((d) => d.balanceCents <= 0)) {
      return { months: month, interestCents: interest, unbounded: false, order: orderNames };
    }
  }
  return { months: null, interestCents: null, unbounded: true, order: orderNames };
}

export function buildDebtScenarios(bills: Bill[], surplusCents: number): { scenarios: DebtScenario[]; extraCents: number } {
  const lines = debtLines(bills);
  const extra = Math.max(0, surplusCents);
  const specs: { name: DebtScenario["name"]; key: "minimums" | "avalanche" | "snowball"; extra: number }[] = [
    { name: "Minimums only", key: "minimums", extra: 0 },
    { name: "Avalanche", key: "avalanche", extra },
    { name: "Snowball", key: "snowball", extra },
  ];
  const scenarios = specs.map((spec) => {
    const sim = simulateDebt(lines, spec.key, spec.extra);
    let note = "Model only. It assumes the rate stays constant, you add no new charges, and the extra payment never misses a month.";
    if (lines.length === 0) note = "Add a debt with a balance, an APR, and a payment to run this.";
    else if (sim.unbounded) note = "These payments do not clear the balance within 40 years. The minimum is not covering interest, or the extra payment is zero. This is not a cue to borrow.";
    else if (spec.key !== "minimums" && extra === 0)
      note =
        "There is no surplus after the bills on this list. Avalanche and snowball add nothing extra; they only roll a payment forward after a balance hits zero. Do not create a surplus by skipping food, rent, or insurance.";
    return {
      name: spec.name,
      months: sim.months,
      interestCents: sim.interestCents,
      unbounded: sim.unbounded,
      order: sim.order,
      note,
    };
  });
  return { scenarios, extraCents: extra };
}

function program(
  id: string,
  name: string,
  status: ProgramStatus,
  summary: string,
  why: string,
  steps: string[],
  sources: SourceRef[],
): ProgramMatch {
  return { id, name, status, summary, why, steps, sources };
}

export function screenPrograms(profile: Profile, bills: Bill[]): ProgramMatch[] {
  const sizeNote =
    profile.size > 8
      ? " Household size is above 8, so the SNAP dollar limit used here is approximate."
      : "";
  const netCaveat =
    " You entered take-home pay, not gross. Programs almost always use gross income, and many add other tests. A match here is a reason to ask, not an award.";
  const akhi =
    profile.state === "AK" || profile.state === "HI"
      ? " Alaska and Hawaii use higher poverty guidelines than this table, so Hearth will not call you unlikely."
      : "";

  const snapLimit = snapGrossMonthlyCents(profile.size);
  const snapRead = incomeRead(profile, snapLimit);
  const liheapLimit = percentOfFplMonthlyCents(profile.size, 150);
  const liheapRead = incomeRead(profile, liheapLimit);
  const lifelineLimit = percentOfFplMonthlyCents(profile.size, 135);
  const lifelineRead = incomeRead(profile, lifelineLimit);
  const wicLimit = percentOfFplMonthlyCents(profile.size, 185);
  const wicRead = incomeRead(profile, wicLimit);
  const wicPerson = profile.childrenUnder5 > 0 || profile.pregnantOrPostpartum;

  const programs: ProgramMatch[] = [
    program(
      "snap",
      "SNAP",
      snapRead === "unlikely" ? "unlikely" : snapRead === "ask" ? "ask" : "info",
      "Food assistance run by your state with federal rules.",
      snapRead === "unlikely"
        ? `Take-home already sits above the ${KB_AS_OF} gross monthly limit for a household of ${profile.size} in the 48 states and DC (about $${(snapLimit / 100).toFixed(0)}). Gross income is at least take-home, so an income-only SNAP application is unlikely unless a categorical exception applies.${sizeNote}`
        : snapRead === "ask"
          ? `Take-home is at or under the gross monthly limit of about $${(snapLimit / 100).toFixed(0)} for this household size. That is not eligibility. Gross pay, a net test, citizenship, and work rules still apply.${sizeNote}${netCaveat}`
          : `Income was not screened against the 48-state table.${akhi} The published gross limit for this size is about $${(snapLimit / 100).toFixed(0)} a month in the 48 states and DC.${sizeNote}`,
      [
        "Apply with your state SNAP agency, not a paid preparer.",
        "Bring ID, household size, and income. Ask what counts as gross.",
        FUNDING_NOTE,
      ],
      [SRC.snap, SRC.poverty],
    ),
    program(
      "wic",
      "WIC",
      !wicPerson ? "not_indicated" : wicRead === "unlikely" ? "unlikely" : "ask",
      "Food and nutrition support for pregnancy, postpartum, infants, and children under five.",
      !wicPerson
        ? "Nothing entered says the household is pregnant, postpartum, or caring for a child under five. If that is wrong, update the household file."
        : wicRead === "unlikely"
          ? "Take-home is above 185% of the 2026 poverty guideline, a common WIC ceiling. Adjunctive eligibility through SNAP or Medicaid can still apply. Ask the clinic."
          : `A child under five or a pregnancy was entered, and take-home does not by itself rule out the common 185% test.${netCaveat}${akhi}`,
      ["Find the local WIC clinic through your state health department.", "Ask about adjunctive eligibility if you already have Medicaid or SNAP."],
      [SRC.wic],
    ),
    program(
      "liheap",
      "LIHEAP",
      liheapRead === "unlikely" ? "unlikely" : liheapRead === "ask" ? "ask" : "info",
      "State-run help with heating and cooling bills. It is not a loan and it is not paid to you by a private grant company.",
      liheapRead === "unlikely"
        ? "Take-home is above 150% of the 2026 poverty guideline. Some states go higher, up to 60% of state median income. Unlikely is not the same word as ineligible."
        : liheapRead === "ask"
          ? `Take-home is within 150% of poverty for this household size (annual guideline about $${fplAnnual48(profile.size).toLocaleString("en-US")}). Your state may use a different test.${netCaveat}`
          : `Not screened against the 48-state table.${akhi} Ask the state LIHEAP office what they use this winter.`,
      [
        "Contact the state LIHEAP office or 211. Do not pay an application fee.",
        "If someone offers a LIHEAP grant by text and asks for money, it is not LIHEAP.",
        FUNDING_NOTE,
      ],
      [SRC.liheap],
    ),
    program(
      "lifeline",
      "Lifeline phone or internet discount",
      lifelineRead === "unlikely" ? "unlikely" : lifelineRead === "ask" ? "ask" : "info",
      "A federal discount on phone or internet service for qualifying households. One discount per household.",
      lifelineRead === "unlikely"
        ? "Take-home is above 135% of the poverty guidelines. You can still qualify through SNAP, Medicaid, SSI, or certain housing programs. Check USAC rather than a carrier ad."
        : lifelineRead === "ask"
          ? `Take-home is within 135% of the 2026 guidelines. That is one path. Categorical eligibility is another.${netCaveat}`
          : `Not screened.${akhi} Confirm the current monthly discount on the USAC site before you count it.`,
      [
        "Apply through USAC or a participating company, and keep the approval.",
        "Do not use the Affordable Connectivity Program. It ended.",
      ],
      [SRC.lifeline, SRC.fccLifeline],
    ),
    program(
      "acp",
      "Affordable Connectivity Program",
      "closed",
      "Ended. Listed so you do not chase it.",
      "The FCC wound the program down. Service ended after June 1, 2024. Anyone charging a fee to 'reactivate ACP' is not doing that.",
      ["Ignore ACP ads.", "Look at Lifeline instead, using the official USAC page."],
      [SRC.acp],
    ),
    program(
      "eitc",
      "Earned Income Tax Credit",
      profile.monthlyTakeHomeCents > 0 ? "ask" : "info",
      "A refundable federal tax credit for people who work and have earned income under IRS limits.",
      "Hearth does not estimate the credit. The amount depends on earned income, filing status, and qualifying children, and the IRS publishes the table. Take-home pay is not the figure on the form.",
      [
        "Read the current IRS EITC table before you file.",
        "Use IRS Free File or a VITA site if you want a preparer. Do not pay a large fee against a refund you have not seen.",
      ],
      [SRC.eitc],
    ),
    program(
      "medicaid",
      "Medicaid and CHIP",
      "info",
      "Health coverage with state income rules. This is administrative navigation, not a coverage decision.",
      "Limits, expansion status, and disability pathways differ by state. Hearth will not tell you that you qualify or that you do not.",
      ["Start at HealthCare.gov or your state Medicaid agency.", "If you were denied, ask for the denial reason in writing and the appeal deadline."],
      [SRC.medicaid],
    ),
    program(
      "call-211",
      "211",
      "info",
      "A local directory for utility aid, food, rent help, and other programs this file does not know.",
      "National rules are a bad map of city funds. 211 is the layer under them. The call is free.",
      ["Call 211 or search 211.org with your ZIP.", "Ask specifically about shutoff aid and rent aid if those are the crisis."],
      [SRC.call211, SRC.benefits],
    ),
  ];

  if (profile.disability || profile.age65Plus) {
    programs.push(
      program(
        "ssi",
        "Supplemental Security Income",
        "info",
        "A Social Security program for people with little income and resources who are 65 or older, blind, or disabled.",
        "A checkbox is not a medical finding and not an award. SSA decides. Application dates can matter, so ask them rather than waiting on a cleaner estimate.",
        ["Read the SSA SSI page and start with them.", "Keep copies of what you submit."],
        [SRC.ssi],
      ),
    );
  }

  if (profile.age65Plus) {
    programs.push(
      program(
        "extra-help",
        "Medicare Extra Help",
        "info",
        "Help with Medicare prescription drug costs for people with limited income and resources.",
        "Resource limits apply and change. Hearth does not collect account balances beyond what you typed, and it will not guess the subsidy.",
        ["Check the SSA Extra Help page.", "Ask a SHIP counselor in your state if the form is unclear. SHIP does not sell policies."],
        [SRC.extraHelp],
      ),
    );
  }

  const housingMonthly = sumMonthly(bills.filter((b) => b.category === "housing"));
  if (profile.housing !== "other" || housingMonthly > 0) {
    programs.push(
      program(
        "hud",
        "HUD housing counseling",
        housingMonthly > 0 && profile.monthlyTakeHomeCents > 0 && housingMonthly / profile.monthlyTakeHomeCents > 0.3
          ? "ask"
          : "info",
        "Free or low-cost counseling on rent, foreclosure, and housing search. Not a lender.",
        "Use it when the housing bill is the problem you cannot see around. Confirm the agency is HUD-approved before you share documents.",
        ["Find a counselor from HUD, not from a postcard.", "Bring the lease or mortgage statement."],
        [SRC.hud],
      ),
    );
  }

  const childcare = bills.some((b) => b.category === "childcare") || profile.childrenUnder5 > 0;
  if (childcare) {
    programs.push(
      program(
        "dependent-care",
        "Child and Dependent Care Credit",
        "info",
        "A federal tax credit for care that lets you work. State subsidies are separate and usually have waitlists.",
        "Hearth does not compute the credit. Keep receipts and provider tax ID information. A state childcare subsidy is a different application.",
        ["Read the IRS page for the current credit.", "Ask 211 about the state childcare subsidy and the waitlist."],
        [SRC.careCredit, SRC.call211],
      ),
    );
  }

  if (profile.hasStudentLoans || bills.some((b) => b.category === "debt" && /student/i.test(b.name))) {
    programs.push(
      program(
        "student",
        "Federal student loan repayment",
        "ask",
        "Income-driven plans and forgiveness rules live on studentaid.gov. They move.",
        "Hearth will not name a plan. A private refinance can strip federal protections. That trade is yours to make after you read the official comparison, not from an ad.",
        ["Sign in at studentaid.gov and download your loan list.", "Ignore any company that charges to 'file your forgiveness'."],
        [SRC.student, SRC.cfpb],
      ),
    );
  }

  if (profile.hasMedicalBills || bills.some((b) => b.category === "medical")) {
    programs.push(
      program(
        "medical-bills",
        "Medical bill review and hospital financial assistance",
        "ask",
        "Administrative help only. Hearth does not read diagnoses or tell you what care to get.",
        "Nonprofit hospitals are required to have a financial-assistance policy. An itemized bill is the first document. A medical credit card is a loan.",
        [
          "Request an itemized bill and the financial-assistance application from the provider.",
          "Compare the bill to the explanation of benefits before you pay.",
          "Use the CFPB medical-bill page if a collector is involved.",
        ],
        [SRC.medicalBill, SRC.cfpb],
      ),
    );
  }

  if (profile.veteran) {
    programs.push(
      program(
        "va",
        "VA benefits",
        "info",
        "Health, disability, housing, and pension programs run by the Department of Veterans Affairs. Separate from the programs above.",
        "A checkbox is not a rating and not an award. Start at VA.gov or a veterans service officer. Do not pay a company to file the claim for you before you have read the free path.",
        ["Go to VA.gov and look up the benefit you mean, by name.", "Ask a VA-recognized veterans service organization if you want a person to sit with the form."],
        [SRC.va],
      ),
    );
  }

  if (profile.recentJobLoss) {
    programs.push(
      program(
        "unemployment",
        "Unemployment insurance",
        "ask",
        "A state program with deadlines. Missing the week you file can cost the claim.",
        "Hearth cannot see whether your separation qualifies. File with the state agency and keep the confirmation number.",
        ["File with your state unemployment office this week if you have not.", "Report wages the way the state asks. Do not guess."],
        [SRC.unemployment],
      ),
    );
  }

  const heavyEnergy = bills.some((b) => (b.category === "electric" || b.category === "gas") && monthlyCents(b) >= 15_000);
  if (heavyEnergy && liheapRead !== "unlikely") {
    programs.push(
      program(
        "wap",
        "Weatherization Assistance Program",
        "info",
        "Free home weatherization for eligible households, usually with a waitlist. Not a rebate app.",
        "Income rules are local. A high energy bill is a reason to ask, not proof you will be served.",
        ["Ask the state energy office or 211 for the local weatherization agency.", "Do not pay a contractor who says they can move you up the federal list."],
        [SRC.energy, SRC.call211],
      ),
    );
  }

  const rank: Record<ProgramStatus, number> = {
    ask: 0,
    info: 1,
    unlikely: 2,
    closed: 3,
    not_indicated: 4,
  };
  return programs.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}

export function analyze(profile: Profile, bills: Bill[], today = todayISO()): Analysis {
  const monthlyIncomeCents = profile.monthlyTakeHomeCents;
  const monthlyObligationsCents = sumMonthly(bills);
  const monthlySurplusCents = monthlyIncomeCents - monthlyObligationsCents;
  const housing = sumMonthly(bills.filter((b) => b.category === "housing"));
  const housingRatio = monthlyIncomeCents > 0 ? housing / monthlyIncomeCents : null;
  const findings = buildFindings(profile, bills, today);
  const programs = screenPrograms(profile, bills);
  const debt = buildDebtScenarios(bills, monthlySurplusCents);
  return {
    monthlyIncomeCents,
    monthlyObligationsCents,
    monthlySurplusCents,
    housingRatio,
    findings,
    programs,
    debts: debt.scenarios,
    extraPaymentCents: debt.extraCents,
  };
}

export function verifiedAnnualCents(
  rows: { monthlyBeforeCents: number; monthlyAfterCents: number }[],
): number {
  return rows.reduce((s, r) => s + (r.monthlyBeforeCents - r.monthlyAfterCents) * 12, 0);
}

export function confidenceWord(c: Confidence): string {
  if (c === "high") return "High confidence";
  if (c === "medium") return "Medium confidence";
  return "Low confidence";
}

export function riskWord(r: Risk): string {
  if (r === "high") return "Higher risk if you rush";
  if (r === "medium") return "Some risk";
  return "Low risk";
}
