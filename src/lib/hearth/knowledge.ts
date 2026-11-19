import type { SourceRef } from "./types.ts";

/**
 * Knowledge base stamped 2026-11-18.
 * Figures for the 48 contiguous states and DC only.
 * Alaska and Hawaii use higher poverty guidelines; the engine refuses a
 * pass/fail income screen there.
 *
 * SNAP gross monthly limits for household sizes 1–8 match the USDA
 * Oct 1, 2026–Sep 30, 2027 table (130% of the 2026 poverty guideline).
 * Size 9+ adds $616, the published step from size 7 to 8, and is labeled approximate.
 */

export const KB_AS_OF = "2026-11-18";

export const HEARTH_HEURISTIC: SourceRef = {
  name: "Hearth heuristic",
  url: "https://www.consumerfinance.gov/consumer-tools/",
  asOf: KB_AS_OF,
  note: "Not a price index and not a quote. The range is an illustration of a phone call, not a promised saving.",
};

export function fplAnnual48(size: number): number {
  const n = Math.max(1, Math.floor(size));
  return 15_960 + (n - 1) * 5_680;
}

/** Cents. Sizes 1–8 are the USDA table. */
export function snapGrossMonthlyCents(size: number): number {
  const table = [0, 172_900, 234_500, 296_000, 357_500, 419_100, 480_600, 542_100, 603_700];
  const n = Math.max(1, Math.floor(size));
  if (n <= 8) return table[n] ?? table[1];
  return 603_700 + (n - 8) * 61_600;
}

export function percentOfFplMonthlyCents(size: number, percent: number): number {
  const annualDollars = fplAnnual48(size) * (percent / 100);
  return Math.round(annualDollars / 12) * 100;
}

export const SRC = {
  snap: {
    name: "USDA FNS — SNAP",
    url: "https://www.fns.usda.gov/snap",
    asOf: KB_AS_OF,
    note: "Gross monthly limits used here are the Oct 1, 2026–Sep 30, 2027 figures for the 48 states and DC. Confirm on USDA before applying.",
  },
  poverty: {
    name: "HHS — 2026 poverty guidelines",
    url: "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines",
    asOf: KB_AS_OF,
    note: "48 contiguous states and DC: $15,960 for one person, plus $5,680 each additional person.",
  },
  liheap: {
    name: "HHS ACF — LIHEAP",
    url: "https://www.acf.hhs.gov/ocs/programs/liheap",
    asOf: KB_AS_OF,
    note: "FY2027 block-grant funds were released October 9, 2026. State offices set the real income test, often up to 150% of poverty or 60% of state median income. LIHEAP does not charge a fee.",
  },
  wic: {
    name: "USDA FNS — WIC",
    url: "https://www.fns.usda.gov/wic",
    asOf: KB_AS_OF,
  },
  lifeline: {
    name: "USAC — Lifeline",
    url: "https://www.lifelinesupport.org",
    asOf: KB_AS_OF,
    note: "Income limit cited at 135% of the federal poverty guidelines, plus categorical eligibility. Confirm the current discount with USAC.",
  },
  fccLifeline: {
    name: "FCC — Lifeline",
    url: "https://www.fcc.gov/lifeline-consumers",
    asOf: KB_AS_OF,
  },
  acp: {
    name: "FCC — Affordable Connectivity Program",
    url: "https://www.fcc.gov/affordable-connectivity-program",
    asOf: KB_AS_OF,
    note: "The Affordable Connectivity Program stopped accepting new applications and ended service after June 1, 2024. Do not pay anyone who offers to enroll you.",
  },
  eitc: {
    name: "IRS — Earned Income Tax Credit",
    url: "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit-eitc",
    asOf: KB_AS_OF,
  },
  careCredit: {
    name: "IRS — Child and Dependent Care Credit",
    url: "https://www.irs.gov/credits-deductions/individuals/child-and-dependent-care-credit",
    asOf: KB_AS_OF,
  },
  medicaid: {
    name: "HealthCare.gov — Medicaid and CHIP",
    url: "https://www.healthcare.gov/medicaid-chip/",
    asOf: KB_AS_OF,
  },
  ssi: {
    name: "SSA — Supplemental Security Income",
    url: "https://www.ssa.gov/ssi",
    asOf: KB_AS_OF,
  },
  extraHelp: {
    name: "SSA — Medicare Extra Help",
    url: "https://www.ssa.gov/medicare/part-d-extra-help",
    asOf: KB_AS_OF,
  },
  hud: {
    name: "HUD — housing counseling",
    url: "https://www.hud.gov",
    asOf: KB_AS_OF,
    note: "Use the HUD counselor search. Counseling is not a loan offer.",
  },
  cfpb: {
    name: "CFPB",
    url: "https://www.consumerfinance.gov",
    asOf: KB_AS_OF,
  },
  student: {
    name: "Federal Student Aid",
    url: "https://studentaid.gov",
    asOf: KB_AS_OF,
    note: "Repayment plans change. Read the official page. This tool does not recommend a servicer or a refinance lender.",
  },
  call211: {
    name: "211",
    url: "https://www.211.org",
    asOf: KB_AS_OF,
  },
  benefits: {
    name: "Benefits.gov",
    url: "https://www.benefits.gov",
    asOf: KB_AS_OF,
  },
  energy: {
    name: "U.S. Department of Energy",
    url: "https://www.energy.gov",
    asOf: KB_AS_OF,
    note: "Weatherization Assistance Program. Local agencies keep the waitlist.",
  },
  unemployment: {
    name: "USA.gov — unemployment benefits",
    url: "https://www.usa.gov/unemployment-benefits",
    asOf: KB_AS_OF,
  },
  va: {
    name: "U.S. Department of Veterans Affairs",
    url: "https://www.va.gov",
    asOf: KB_AS_OF,
    note: "Hearth does not decide VA eligibility and does not file a claim.",
  },
  medicalBill: {
    name: "CFPB — medical bills",
    url: "https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-i-cant-pay-a-medical-bill-en-2125/",
    asOf: KB_AS_OF,
  },
} satisfies Record<string, SourceRef>;

export const FUNDING_NOTE =
  "As of November 18, 2026, a federal stopgap was reported to keep SNAP and WIC operating through December 11, 2026. LIHEAP FY2027 funds had been released to states in October under that same stopgap. An office can still be closed, backlogged, or out of crisis funds. Call before you count on a benefit.";

export type Cluster = { id: string; label: string; needles: string[] };

export const SUBSCRIPTION_CLUSTERS: Cluster[] = [
  {
    id: "video",
    label: "video streaming",
    needles: [
      "netflix",
      "hulu",
      "disney",
      "hbo",
      "max",
      "paramount",
      "peacock",
      "apple tv",
      "youtube tv",
      "youtube premium",
      "prime video",
    ],
  },
  {
    id: "music",
    label: "music streaming",
    needles: ["spotify", "apple music", "amazon music", "youtube music", "tidal", "pandora"],
  },
  {
    id: "cloud",
    label: "cloud storage",
    needles: ["icloud", "google one", "dropbox", "onedrive"],
  },
];
