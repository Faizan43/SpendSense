/**
 * Hand-maintained mirror of supabase/migrations. Regenerate-equivalent shape to
 * `supabase gen types typescript`, kept in the repo so the app type-checks
 * without a live database connection. If you change a migration, change this.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReceiptStatus =
  | "uploaded"
  | "processing"
  | "needs_review"
  | "confirmed"
  | "failed";

export type TransactionSource = "receipt" | "manual" | "import";

export type CategorySource = "user" | "product" | "rule" | "ai" | "fallback";

export type RuleSource = "system" | "learned" | "user";

export type MatchType = "contains" | "exact" | "prefix";

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;
  locale: string;
  week_starts_on: number;
  default_alert_threshold_pct: number;
  onboarded_at: string | null;
};

export type CategoryRow = Timestamps & {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  icon: string;
  chart_slot: number;
  is_system: boolean;
  sort_order: number;
};

export type CategoryRuleRow = Timestamps & {
  id: string;
  user_id: string;
  category_id: string;
  pattern: string;
  match_type: MatchType;
  priority: number;
  source: RuleSource;
};

export type StoreRow = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  chain: string | null;
};

export type ProductRow = Timestamps & {
  id: string;
  user_id: string;
  canonical_name: string;
  normalized_name: string;
  default_category_id: string | null;
  unit: string | null;
};

export type ReceiptRow = Timestamps & {
  id: string;
  user_id: string;
  store_id: string | null;
  purchase_date: string | null;
  subtotal_minor: number | null;
  tax_minor: number | null;
  total_minor: number | null;
  currency: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string;
  file_size_bytes: number | null;
  page_count: number | null;
  status: ReceiptStatus;
  ocr_model: string | null;
  ocr_raw: Json | null;
  ocr_confidence: number | null;
  processed_at: string | null;
  error_message: string | null;
};

export type TransactionRow = Timestamps & {
  id: string;
  user_id: string;
  store_id: string | null;
  receipt_id: string | null;
  purchase_date: string;
  total_minor: number;
  currency: string;
  notes: string | null;
  source: TransactionSource;
};

export type TransactionItemRow = Timestamps & {
  id: string;
  user_id: string;
  transaction_id: string;
  product_id: string | null;
  category_id: string | null;
  name: string;
  raw_text: string | null;
  quantity: number;
  unit: string | null;
  unit_price_minor: number | null;
  total_price_minor: number;
  notes: string | null;
  category_source: CategorySource;
  category_confidence: number | null;
  position: number;
};

export type BudgetRow = Timestamps & {
  id: string;
  user_id: string;
  period_month: string;
  category_id: string | null;
  amount_minor: number;
  alert_threshold_pct: number;
  rolls_over: boolean;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Json;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
};

type Insertable<T, Required extends keyof T> = Partial<Omit<T, Required>> &
  Pick<T, Required>;

export type PeriodSummary = {
  total_minor: number;
  trip_count: number;
  item_count: number;
  avg_trip_minor: number;
};

export type CategorySpend = {
  category_id: string | null;
  category_name: string;
  category_slug: string;
  chart_slot: number;
  total_minor: number;
  item_count: number;
};

export type MonthlyPoint = {
  month: string;
  total_minor: number;
  trip_count: number;
};

export type WeeklyPoint = {
  week_start: string;
  total_minor: number;
  trip_count: number;
};

export type StoreSpend = {
  store_id: string | null;
  store_name: string;
  total_minor: number;
  trip_count: number;
  avg_trip_minor: number;
  item_count: number;
};

export type TopProduct = {
  product_key: string;
  product_name: string;
  category_name: string;
  chart_slot: number;
  total_minor: number;
  total_quantity: number;
  times_bought: number;
};

export type PricePoint = {
  purchase_date: string;
  store_name: string;
  unit_price_minor: number | null;
  quantity: number;
  total_price_minor: number;
};

export type BudgetProgress = {
  budget_id: string;
  category_id: string | null;
  category_name: string;
  category_slug: string;
  chart_slot: number;
  amount_minor: number;
  spent_minor: number;
  alert_threshold_pct: number;
};

export type CategoryMover = {
  category_id: string | null;
  category_name: string;
  current_minor: number;
  previous_minor: number;
  delta_minor: number;
};

export type PriceMover = {
  product_key: string;
  product_name: string;
  first_unit_price_minor: number;
  last_unit_price_minor: number;
  change_pct: number;
  purchases: number;
};

export type ProductSuggestionRow = {
  name: string;
  category_id: string | null;
  unit: string | null;
  last_unit_price_minor: number | null;
  times_bought: number;
  last_bought: string | null;
};

export type WeekdayPoint = {
  weekday: number;
  total_minor: number;
  trip_count: number;
};

type Filters = {
  p_store_ids?: string[] | null;
  p_category_ids?: string[] | null;
  p_min_minor?: number | null;
  p_max_minor?: number | null;
  p_search?: string | null;
};

/** supabase-js requires every table entry to carry a Relationships tuple. */
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Insertable<ProfileRow, "id">,
        Partial<ProfileRow>
      >;
      categories: Table<
        CategoryRow,
        Insertable<CategoryRow, "slug" | "name">,
        Partial<CategoryRow>
      >;
      category_rules: Table<
        CategoryRuleRow,
        Insertable<CategoryRuleRow, "category_id" | "pattern">,
        Partial<CategoryRuleRow>
      >;
      stores: Table<
        StoreRow,
        Insertable<StoreRow, "name" | "normalized_name">,
        Partial<StoreRow>
      >;
      products: Table<
        ProductRow,
        Insertable<ProductRow, "canonical_name" | "normalized_name">,
        Partial<ProductRow>
      >;
      receipts: Table<
        ReceiptRow,
        Insertable<ReceiptRow, "storage_path" | "mime_type">,
        Partial<ReceiptRow>
      >;
      transactions: Table<
        TransactionRow,
        Insertable<TransactionRow, "purchase_date">,
        Partial<TransactionRow>
      >;
      transaction_items: Table<
        TransactionItemRow,
        Insertable<TransactionItemRow, "transaction_id" | "name">,
        Partial<TransactionItemRow>
      >;
      budgets: Table<
        BudgetRow,
        Insertable<BudgetRow, "period_month" | "amount_minor">,
        Partial<BudgetRow>
      >;
      notifications: Table<
        NotificationRow,
        Insertable<NotificationRow, "type" | "title">,
        Partial<NotificationRow>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      fn_period_summary: {
        Args: { p_from: string; p_to: string } & Filters;
        Returns: PeriodSummary[];
      };
      fn_spend_by_category: {
        Args: { p_from: string; p_to: string } & Filters;
        Returns: CategorySpend[];
      };
      fn_monthly_trend: {
        Args: {
          p_months?: number;
          p_store_ids?: string[] | null;
          p_category_ids?: string[] | null;
          p_search?: string | null;
        };
        Returns: MonthlyPoint[];
      };
      fn_weekly_spend: {
        Args: {
          p_weeks?: number;
          p_week_starts_on?: number;
          p_store_ids?: string[] | null;
          p_category_ids?: string[] | null;
          p_search?: string | null;
        };
        Returns: WeeklyPoint[];
      };
      fn_store_comparison: {
        Args: {
          p_from: string;
          p_to: string;
          p_category_ids?: string[] | null;
          p_search?: string | null;
        };
        Returns: StoreSpend[];
      };
      fn_top_products: {
        Args: {
          p_from: string;
          p_to: string;
          p_metric?: string;
          p_limit?: number;
          p_store_ids?: string[] | null;
          p_category_ids?: string[] | null;
        };
        Returns: TopProduct[];
      };
      fn_price_history: {
        Args: { p_normalized_name: string };
        Returns: PricePoint[];
      };
      fn_budget_progress: {
        Args: { p_month: string };
        Returns: BudgetProgress[];
      };
      fn_category_movers: {
        Args: { p_month: string };
        Returns: CategoryMover[];
      };
      fn_price_movers: {
        Args: {
          p_lookback_days?: number;
          p_min_purchases?: number;
          p_limit?: number;
        };
        Returns: PriceMover[];
      };
      fn_weekday_pattern: {
        Args: { p_from: string; p_to: string };
        Returns: WeekdayPoint[];
      };
      fn_product_suggestions: {
        Args: { p_limit?: number };
        Returns: ProductSuggestionRow[];
      };
      /** Seeds the caller's profile, categories and keyword rules. Idempotent. */
      ensure_user_defaults: { Args: Record<string, never>; Returns: undefined };
      /** Demo data for the signed-in user. Returns a summary string. */
      seed_demo_data: { Args: Record<string, never>; Returns: string };
      normalize_name: { Args: { input: string }; Returns: string };
    };
    Enums: {
      receipt_status: ReceiptStatus;
      transaction_source: TransactionSource;
      category_source: CategorySource;
      rule_source: RuleSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
