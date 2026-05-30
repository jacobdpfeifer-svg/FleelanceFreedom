export type Plan = "free" | "pro" | "agency";

export interface UserRow {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  plan: Plan;
  message_count: number;
  messages_reset_at: string;
}

export type FreelancerType =
  | "copywriter"
  | "social"
  | "content"
  | "ux"
  | "pr"
  | "general";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  freelancer_type: FreelancerType;
  created_at: string;
}

export interface Decision {
  topic: string;
  /** The standing instruction we follow without being asked. */
  detail: string;
  recorded_at: string;
}

export interface SentenceStyle {
  avg_length?: "short" | "medium" | "long";
  uses_emdash?: boolean;
  opens_with_question?: boolean;
  oxford_comma?: boolean;
  exclamation_points?: boolean;
  first_person?: boolean;
}

export interface Structure {
  uses_bullets?: boolean;
  email_signoff?: string;
  paragraph_length?: "short" | "medium" | "long";
  cta_style?: string;
}

export type SampleType = "email" | "social" | "longform";

export interface Sample {
  type: SampleType;
  text: string;
}

export interface Rejection {
  sample: string;
  reason: string;
}

export interface ClientMemory {
  id: string;
  client_id: string;
  brand_voice: string | null;
  tone_rules: string[];
  decisions: Decision[];
  sample_copy: string | null;
  negative_examples: string | null;
  audience_profile: string | null;
  updated_at: string;
  // Stage 3
  samples: Sample[];
  vocab_use: string[];
  vocab_avoid: string[];
  sentence_style: SentenceStyle;
  structure: Structure;
  rejections: Rejection[];
}

/**
 * Union of client identity + memory fields. Passed to buildClientContext()
 * so it has everything it needs in one flat object.
 */
export type MemoryContext = {
  name: string;
  industry?: string | null;
} & Partial<Omit<ClientMemory, "id" | "client_id" | "updated_at">>;

/** Result from analyzeSample — confirmed and merged into memory. */
export interface AnalysisResult {
  sentence_style: SentenceStyle;
  vocab_use: string[];
  vocab_avoid: string[];
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type TaskType =
  | "general"
  | "social_post"
  | "email"
  | "blog"
  | "ad_copy"
  | "landing_page";

export interface ChatSession {
  id: string;
  client_id: string;
  messages: ChatMessage[];
  task_type: TaskType;
  created_at: string;
}
