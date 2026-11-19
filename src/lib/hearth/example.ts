import type { Bill, Profile } from "./types.ts";

/** Fictional. Illinois. Used only when someone asks to see a worked file. */
export const EXAMPLE_PROFILE: Profile = {
  name: "Hale household",
  state: "IL",
  size: 3,
  childrenUnder5: 1,
  monthlyTakeHomeCents: 420_000,
  savingsCents: 35_000,
  housing: "rent",
  pregnantOrPostpartum: false,
  disability: false,
  age65Plus: false,
  veteran: false,
  recentJobLoss: false,
  hasStudentLoans: true,
  hasMedicalBills: false,
};

export const EXAMPLE_BILLS: Bill[] = [
  bill("rent", "Rent", "housing", 165_000, "monthly"),
  bill("electric", "City electric", "electric", 18_000, "monthly", { previousAmountCents: 14_000 }),
  bill("gas", "Gas heat", "gas", 9_000, "monthly"),
  bill("internet", "Home internet", "internet", 9_500, "monthly"),
  bill("phone", "Mobile", "phone", 14_000, "monthly"),
  bill("netflix", "Netflix", "subscription", 1_549, "monthly"),
  bill("hulu", "Hulu", "subscription", 1_799, "monthly"),
  bill("spotify", "Spotify", "subscription", 1_199, "monthly"),
  bill("auto", "Auto insurance", "insurance", 16_000, "monthly", { lastReviewed: "2024-06-01" }),
  bill("student", "Student loan", "debt", 21_000, "monthly", { balanceCents: 1_800_000, aprPercent: 6.5 }),
  bill("card", "Credit card", "debt", 7_500, "monthly", { balanceCents: 420_000, aprPercent: 24.99 }),
  bill("bank", "Bank maintenance fee", "banking", 1_200, "monthly"),
  bill("groceries", "Groceries", "groceries", 65_000, "monthly"),
  bill("fuel", "Gasoline", "transport", 16_000, "monthly"),
];

function bill(
  id: string,
  name: string,
  category: Bill["category"],
  amountCents: number,
  cycle: Bill["cycle"],
  extra: Partial<Bill> = {},
): Bill {
  return {
    id,
    name,
    category,
    amountCents,
    cycle,
    previousAmountCents: null,
    balanceCents: null,
    aprPercent: null,
    lastReviewed: null,
    renewsOn: null,
    notes: "",
    ...extra,
  };
}
