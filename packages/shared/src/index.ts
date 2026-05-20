export type AgentType = "triage" | "faq" | "booking" | "receptionist" | "records";

export interface ChatRequest {
  hospitalId: string;
  sessionId: string;
  agentType: AgentType;
  patientMessage: string;
  patientContext?: {
    age?: number;
    gender?: string;
    existingConditions?: string[];
  };
}

export interface ChatAction {
  type: "escalate" | "notify" | "none";
  reason?: string;
  channel?: "SMS" | "EMAIL" | "WHATSAPP";
  message?: string;
}

export interface ChatResponse {
  traceId: string;
  response: string;
  urgency: "low" | "medium" | "high" | "emergency";
  actions: ChatAction[];
  toolResults: Record<string, unknown>;
}
