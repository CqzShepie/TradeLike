export type PricingPlanName = "Solo" | "Team" | "Business" | "Enterprise";

export type PricingPlan = {
  name: PricingPlanName;
  pricePence: number | null;
  displayPrice: string;
  includedUsers: number | null;
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Solo",
    pricePence: 3995,
    displayPrice: "£39.95/month",
    includedUsers: 1,
    features: ["1 user", "Email support", "Basic reporting"],
  },
  {
    name: "Team",
    pricePence: 9995,
    displayPrice: "£99.95/month",
    includedUsers: 10,
    features: ["2-10 users", "Priority support", "Advanced reporting"],
  },
  {
    name: "Business",
    pricePence: 15995,
    displayPrice: "£159.95/month",
    includedUsers: 25,
    features: ["11-25 users", "Dedicated support", "Business reporting", "API access"],
  },
  {
    name: "Enterprise",
    pricePence: null,
    displayPrice: "Contact Sales",
    includedUsers: null,
    features: ["Unlimited users", "Dedicated support", "Enterprise reporting", "API access"],
  },
];

export const planMixAssumptions = {
  Solo: 72,
  Team: 20,
  Business: 7,
  Enterprise: 1,
} satisfies Record<PricingPlanName, number>;

export const selfServeMonthlyPlanPriceSumPence = 29985;
