export type BillingTermMonths = 3 | 6 | 9;

export type BillingOption = {
  months: BillingTermMonths;
  price: string;
  label: string;
  description: string;
  recommended?: boolean;
};

export const ESSENTIAL_BILLING_OPTIONS: BillingOption[] = [
  {
    months: 3,
    price: "R89.99",
    label: "3 months use",
    description: "Best starter option for students who want to test the Essential plan.",
    recommended: true,
  },
  {
    months: 6,
    price: "R169.99",
    label: "6 months use",
    description: "Lower monthly equivalent with a longer access period.",
  },
  {
    months: 9,
    price: "R249.99",
    label: "9 months use",
    description: "Best value for longer application journeys.",
  },
];

export function normalizeBillingTermMonths(value: string | number | null | undefined): BillingTermMonths | null {
  const months = Number.parseInt(String(value ?? ""), 10);
  if (months === 3 || months === 6 || months === 9) return months;
  return null;
}

export function getEssentialBillingOption(months: BillingTermMonths | null | undefined): BillingOption | undefined {
  return ESSENTIAL_BILLING_OPTIONS.find((option) => option.months === months);
}

export function formatBillingTermLabel(months: BillingTermMonths | null | undefined): string {
  const option = getEssentialBillingOption(months);
  return option ? option.label : "3 months use";
}
