export type BillCycle = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type BillCategory =
  | "housing"
  | "electric"
  | "gas"
  | "water"
  | "internet"
  | "phone"
  | "insurance"
  | "subscription"
  | "transport"
  | "groceries"
  | "childcare"
  | "medical"
  | "debt"
  | "banking"
  | "other";

export type Housing = "rent" | "own" | "other";

export type Profile = {
  name: string;
  state: string;
  size: number;
  childrenUnder5: number;
  monthlyTakeHomeCents: number;
  savingsCents: number;
  housing: Housing;
  pregnantOrPostpartum: boolean;
  disability: boolean;
  age65Plus: boolean;
  veteran: boolean;
  recentJobLoss: boolean;
  hasStudentLoans: boolean;
  hasMedicalBills: boolean;
};

export type Bill = {
  id: string;
  name: string;
  category: BillCategory;
  /** Amount per cycle, in cents. */
  amountCents: number;
  cycle: BillCycle;
  previousAmountCents: number | null;
  balanceCents: number | null;
  /** Nominal APR, e.g. 24.99. Null when the bill is not a debt. */
  aprPercent: number | null;
  lastReviewed: string | null;
  renewsOn: string | null;
  notes: string;
};

export type Confidence = "high" | "medium" | "low";
export type Risk = "low" | "medium" | "high";

export type SourceRef = {
  name: string;
  url: string;
  asOf: string;
  note?: string;
};

export type Finding = {
  id: string;
  title: string;
  detail: string;
  domain: "cashflow" | "bill" | "debt" | "admin";
  /** Annual illustrative range. Null means we refuse to invent a number. */
  estimateLowCents: number | null;
  estimateHighCents: number | null;
  hours: number;
  confidence: Confidence;
  risk: Risk;
  sources: SourceRef[];
  steps: string[];
  billId?: string;
};

export type ProgramStatus = "ask" | "unlikely" | "closed" | "info" | "not_indicated";

export type ProgramMatch = {
  id: string;
  name: string;
  status: ProgramStatus;
  summary: string;
  why: string;
  steps: string[];
  sources: SourceRef[];
};

export type DebtScenario = {
  name: "Minimums only" | "Avalanche" | "Snowball";
  months: number | null;
  interestCents: number | null;
  unbounded: boolean;
  order: string[];
  note: string;
};

export type Analysis = {
  monthlyIncomeCents: number;
  monthlyObligationsCents: number;
  monthlySurplusCents: number;
  housingRatio: number | null;
  findings: Finding[];
  programs: ProgramMatch[];
  debts: DebtScenario[];
  extraPaymentCents: number;
};

export type ActionStatus = "open" | "doing" | "done" | "skipped";

export type ActionRecord = {
  findingId: string;
  status: ActionStatus;
  followUp: string | null;
  note: string;
  updatedAt: string;
};

export type Verification = {
  id: string;
  findingId: string | null;
  label: string;
  monthlyBeforeCents: number;
  monthlyAfterCents: number;
  confirmedOn: string;
  note: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  kind: string;
  detail: string;
};

export const CATEGORY_LABEL: Record<BillCategory, string> = {
  housing: "Housing",
  electric: "Electric",
  gas: "Gas heat",
  water: "Water",
  internet: "Internet",
  phone: "Phone",
  insurance: "Insurance",
  subscription: "Subscription",
  transport: "Transport",
  groceries: "Groceries",
  childcare: "Childcare",
  medical: "Medical",
  debt: "Debt payment",
  banking: "Bank fees",
  other: "Other",
};

export const CYCLE_LABEL: Record<BillCycle, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));
