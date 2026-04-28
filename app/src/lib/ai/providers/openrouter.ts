import type { AIProvider, AIRunRequest, AIRunResult } from "../provider";

/**
 * Minimal OpenRouter provider. Reads OPENROUTER_API_KEY at call time.
 * Falls back to throwing so the router can degrade to mock if no key is set.
 */
export const openrouterProvider: AIProvider = {
  name: "openrouter",
  supports() {
    return true;
  },
  async complete(req: AIRunRequest, model: string): Promise<AIRunResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const start = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://tenxpros.com",
        "X-Title": "TenXPros",
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.2,
        response_format: req.jsonMode ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    let json: unknown;
    if (req.jsonMode) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }
    return {
      provider: "openrouter",
      model,
      text,
      json,
      durationMs: Date.now() - start,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    };
  },
};
