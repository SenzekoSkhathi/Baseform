export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  available: boolean;
  recommended: boolean;
  sortOrder: number;
};

export type HomeStat = {
  value: string;
  label: string;
  icon: "graduation-cap" | "trophy" | "clock";
  color: string;
};

export type SiteConfig = {
  plans: PublicPlan[];
  homeSubtitle: string;
  homeFeatures: string[];
  homeStats: HomeStat[];
};

export const DEFAULT_PLANS: PublicPlan[] = [
  {
    id: "free",
    slug: "free",
    name: "Free",
    price: "R0",
    period: "/month",
    tagline: "Get started",
    features: ["APS score calculator", "See matched universities", "Track up to 3 applications"],
    available: true,
    recommended: false,
    sortOrder: 0,
  },
  {
    id: "essential",
    slug: "essential",
    name: "Essential",
    price: "R59",
    period: "/month",
    tagline: "Most popular",
    features: [
      "Everything in Free",
      "Unlimited application tracking",
      "Bursary matching and discovery",
      "Document vault (upload and store)",
      "AI Coach guidance",
      "Deadline reminders",
    ],
    available: true,
    recommended: true,
    sortOrder: 1,
  },
  {
    id: "pro",
    slug: "pro",
    name: "Pro",
    price: "R129",
    period: "/month",
    tagline: "Coming soon",
    features: [
      "Everything in Essential",
      "Auto-fill application forms",
      "Email status monitoring",
      "Priority support",
    ],
    available: false,
    recommended: false,
    sortOrder: 2,
  },
  {
    id: "ultra",
    slug: "ultra",
    name: "Ultra",
    price: "R249",
    period: "/month",
    tagline: "Coming soon",
    features: [
      "Everything in Pro",
      "WhatsApp guidance bot",
      "Personal application advisor",
      "Application review and feedback",
    ],
    available: false,
    recommended: false,
    sortOrder: 3,
  },
];

export const DEFAULT_HOME_SUBTITLE = "Baseform helps you calculate APS, find matching universities and bursaries, and manage your whole application journey in one powerful dashboard.";

export const DEFAULT_HOME_FEATURES = [
  "Instant APS score calculator",
  "Match to unis and bursaries you qualify for",
  "Track every application in one timeline",
  "Deadline reminders before it is too late",
];

export const DEFAULT_HOME_STATS: HomeStat[] = [
  { icon: "graduation-cap", value: "26+", label: "Universities", color: "text-orange-500" },
  { icon: "trophy", value: "R2M+", label: "Bursaries tracked", color: "text-amber-500" },
  { icon: "clock", value: "24/7", label: "Planning support", color: "text-emerald-500" },
];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  plans: DEFAULT_PLANS,
  homeSubtitle: DEFAULT_HOME_SUBTITLE,
  homeFeatures: DEFAULT_HOME_FEATURES,
  homeStats: DEFAULT_HOME_STATS,
};
