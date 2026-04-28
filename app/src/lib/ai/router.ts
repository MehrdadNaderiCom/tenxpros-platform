import { prisma } from "@/lib/db";
import type { AIProvider, AIRunRequest, AIRunResult } from "./provider";
import { mockProvider } from "./providers/mock";
import { openrouterProvider } from "./providers/openrouter";
import type { AIRunPurpose } from "@prisma/client";

const REGISTRY: Record<string, AIProvider> = {
  mock: mockProvider,
  openrouter: openrouterProvider,
};

function resolveProviderName(): string {
  const requested = process.env.AI_PROVIDER ?? "mock";
  if (requested === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    return "mock"; // graceful fallback
  }
  return requested in REGISTRY ? requested : "mock";
}

function defaultModel(provider: string): string {
  if (provider === "openrouter") return process.env.AI_MODEL ?? "anthropic/claude-3.5-sonnet";
  return "mock-1.0";
}

export interface RouterRunOptions extends Omit<AIRunRequest, "purpose"> {
  purpose: AIRunPurpose;
  initiatorId?: string | null;
}

export async function runAI(opts: RouterRunOptions): Promise<{ runId: string; result: AIRunResult | null; error?: string }> {
  const providerName = opts.model?.includes("/") ? "openrouter" : resolveProviderName();
  const provider = REGISTRY[providerName] ?? mockProvider;
  const model = opts.model ?? defaultModel(providerName);

  const log = await prisma.aIRunLog.create({
    data: {
      initiatorId: opts.initiatorId ?? null,
      purpose: opts.purpose,
      provider: provider.name,
      model,
      promptVersion: opts.promptVersion,
      promptInput: opts.messages as unknown as object,
      status: "RUNNING",
    },
  });

  try {
    const result = await provider.complete(
      { ...opts, purpose: String(opts.purpose) } as AIRunRequest,
      model,
    );
    await prisma.aIRunLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        outputText: result.text,
        outputJson: (result.json as object) ?? undefined,
        durationMs: result.durationMs,
      },
    });
    return { runId: log.id, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.aIRunLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return { runId: log.id, result: null, error: message };
  }
}
