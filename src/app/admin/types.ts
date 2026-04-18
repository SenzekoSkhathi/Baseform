export type DateRangePreset = "7" | "30" | "90" | "custom";

export type MetricDaily = {
  day: string;
  signups: number;
  applications: number;
  tokens: number;
  aiCalls: number;
  emailsSent: number;
  emailsReceived: number;
  emailScanFailures: number;
  filesUploaded: number;
  storageUploadedBytes: number;
};

export type MetricAlert = {
  key: "token_cost_spike" | "storage_growth_spike" | "email_scan_failures";
  severity: "warning" | "critical";
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  occurredOn: string;
};

export type AlertHistoryEntry = {
  alert_key: string;
  occurred_on: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  current_value: number;
  threshold_value: number;
  unit: string;
  range_label: string;
  detected_at: string;
};

export type ContentAuditEntry = {
  entity_type: string;
  entity_key: string;
  action: string;
  before_data: unknown;
  after_data: unknown;
  admin_user_id: string;
  admin_email: string | null;
  created_at: string;
};

export type RankedUser = {
  userId: string;
  label: string;
  value: number;
};

export type MetricsResponse = {
  totals: {
    users: number;
    applications: number;
    tokens: number;
    waitlist: number;
    bursaryTracking: number;
    aiCalls: number;
    emailsSent: number;
    emailsReceived: number;
    activeEmailConnections: number;
    storageBytes: number;
    storageFiles: number;
    basebotThreads: number;
    basebotMessages: number;
  };
  daily: MetricDaily[];
  statusBreakdown: Record<string, number>;
  provinceDistribution: { province: string; count: number }[];
  funnel: { signups: number; createdApplications: number; submittedApplications: number };
  usage: {
    ai: {
      totalTokens: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCalls: number;
      last7dTokens: number;
      last30dTokens: number;
      estimatedCostZar: number;
      topUsersByTokens: RankedUser[];
    };
    email: {
      sentTotal: number;
      receivedTotal: number;
      failedScansTotal: number;
      failedScanRatePercent: number;
      statusChangesDetected: number;
      connectedMailboxes: number;
      activeConnectedMailboxes: number;
      sentByType: Record<string, number>;
      actionsBreakdown: Record<string, number>;
      topUsersByReceivedEmails: RankedUser[];
      topUsersBySentEmails: RankedUser[];
    };
    storage: {
      totalBytes: number;
      totalFiles: number;
      usersWithFiles: number;
      averageBytesPerUser: number;
      uploadedBytesInRange: number;
      topUsersByStorageBytes: RankedUser[];
      topUsersByFileCount: RankedUser[];
    };
    engagement: {
      basebotThreads: number;
      basebotMessages: number;
      topUsersByThreads: RankedUser[];
    };
  };
  alerts: MetricAlert[];
  alertThresholds: {
    tokenCostSpikeZarPerDay: number;
    storageGrowthBytesPerDay: number;
    failedEmailScanRatePercent: number;
    failedEmailScanMinVolume: number;
    aiCostPer1kTokensZar: number;
  };
  range: {
    preset: DateRangePreset;
    from: string;
    to: string;
    label: string;
  };
};

export type AdminUserSubject = {
  subject_name: string;
  mark: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  tier: string | null;
  created_at: string | null;
  province: string | null;
  field_of_interest: string | null;
  school_name: string | null;
  grade_year: string | null;
  financial_need: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_whatsapp_number: string | null;
  guardian_relationship: string | null;
  guardian_email: string | null;
  subjects: AdminUserSubject[];
  aps: number;
};

export type UserPageResponse = {
  items: AdminUser[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type University = {
  id: string;
  name: string;
  abbreviation: string | null;
  province: string | null;
  city: string | null;
  application_fee: number | null;
  closing_date: string | null;
  website_url: string | null;
  application_url: string | null;
  is_active: boolean;
};

export type Programme = {
  id: string;
  name: string;
  university_id: string;
  aps_minimum: number;
  field_of_study: string | null;
  qualification_type: string | null;
  duration_years: number | null;
  additional_requirements: string | null;
};

export type Bursary = {
  id: string;
  title: string;
  provider: string | null;
  description: string | null;
  minimum_aps: number | null;
  amount_per_year: number | null;
  closing_date: string | null;
  application_url: string | null;
  detail_page_url: string | null;
  application_links: string[] | null;
  funding_value: string | null;
  eligibility_requirements: string | null;
  application_instructions: string | null;
  source_category: string | null;
  provinces_eligible: string[] | null;
  fields_of_study: string[] | null;
  requires_financial_need: boolean | null;
  is_active: boolean;
};

export type AdminPlan = {
  id: string;
  slug: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  available: boolean;
  recommended: boolean;
  sort_order: number;
  updated_at: string | null;
};

export type NewPlanDraft = {
  slug: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string;
  available: boolean;
  recommended: boolean;
  sort_order: string;
};

export type SiteSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string | null;
};

export type NewSettingDraft = {
  key: string;
  description: string;
  value: string;
};

export type AlertThresholdDraft = {
  tokenCostSpikeZarPerDay: string;
  storageGrowthBytesPerDayMb: string;
  failedEmailScanRatePercent: string;
  failedEmailScanMinVolume: string;
  aiCostPer1kTokensZar: string;
};

export type ToastState = { type: "success" | "error"; message: string } | null;
export type SortDirection = "asc" | "desc";
