import type { AIProvider, AIRunRequest, AIRunResult } from "../provider";

/**
 * Mock provider used in dev / CI. Returns a deterministic, structured
 * response shaped like an AI completion. NEVER used when AI_PROVIDER !== "mock".
 */
export const mockProvider: AIProvider = {
  name: "mock",
  supports() {
    return true;
  },
  async complete(req: AIRunRequest, model: string): Promise<AIRunResult> {
    const start = Date.now();
    const userMessage = req.messages.find((m) => m.role === "user")?.content ?? "";
    const response = {
      summary: `[mock:${req.purpose}] ${userMessage.slice(0, 200)}`,
      generatedAt: new Date().toISOString(),
      promptVersion: req.promptVersion,
    };
    return {
      provider: "mock",
      model,
      text: JSON.stringify(response, null, 2),
      json: response,
      durationMs: Date.now() - start,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  },
};
