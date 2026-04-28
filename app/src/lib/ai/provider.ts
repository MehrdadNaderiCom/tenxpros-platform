/**
 * Provider-agnostic interface for LLM calls.
 *
 * The platform must NEVER hardcode a single provider. Anything that needs
 * an AI completion calls aiRouter.run(...), which dispatches to a registered
 * provider based on env, never reading secrets at module import time.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRunRequest {
  purpose: string;
  promptVersion: string;
  messages: ChatMessage[];
  temperature?: number;
  jsonMode?: boolean;
  model?: string; // optional override
}

export interface AIRunResult {
  provider: string;
  model: string;
  text: string;
  json?: unknown;
  durationMs: number;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface AIProvider {
  name: string;
  supports(model: string): boolean;
  complete(req: AIRunRequest, model: string): Promise<AIRunResult>;
}
