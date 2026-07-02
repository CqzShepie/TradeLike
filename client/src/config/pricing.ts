export type PricingPlanName = "Solo" | "Team" | "Business" | "Enterprise";

export type PricingPlan = {
  name: PricingPlanName;
  pricePence: number | null;
  displayPrice: string;
  includedUsers: number | null;
  userLimitLabel: string;
  perUserDisplay: string;
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Solo",
    pricePence: 4495,
    displayPrice: "£44.95/month",
    includedUsers: 1,
    userLimitLabel: "1 user",
    perUserDisplay: "£44.95/user",
    features: ["1 user", "Email support", "Basic reporting"],
  },
  {
    name: "Team",
    pricePence: 11995,
    displayPrice: "£119.95/month",
    includedUsers: 10,
    userLimitLabel: "Up to 10 users",
    perUserDisplay: "£12.00/user",
    features: ["Up to 10 users", "Priority support", "Advanced reporting"],
  },
  {
    name: "Business",
    pricePence: 22995,
    displayPrice: "£229.95/month",
    includedUsers: 25,
    userLimitLabel: "Up to 25 users",
    perUserDisplay: "£9.20/user",
    features: ["Up to 25 users", "Dedicated support", "Business reporting", "API access"],
  },
  {
    name: "Enterprise",
    pricePence: null,
    displayPrice: "Contact Sales",
    includedUsers: null,
    userLimitLabel: "26+ users",
    perUserDisplay: "Custom",
    features: ["26+ users", "Dedicated support", "Enterprise reporting", "API access"],
  },
];

export const planMixAssumptions = {
  Solo: 72,
  Team: 20,
  Business: 7,
  Enterprise: 1,
} satisfies Record<PricingPlanName, number>;

export const selfServeMonthlyPlanPriceSumPence = 39485;
