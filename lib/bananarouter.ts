import {
  getEnvBananaRouterConfig,
  reportA100CredentialEvent,
  resolveA100Credential,
  type A100CredentialEvent,
  type A100ResolvedCredential,
} from "./credential-hub-client.ts";

export interface BananaRouterConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface BananaRouterTextOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface BananaRouterDependencies {
  config?: BananaRouterConfig;
  fetchImpl?: typeof fetch;
  resolveConfig?: () => Promise<A100ResolvedCredential>;
  reportEvent?: (event: A100CredentialEvent) => Promise<void>;
}

export function getBananaRouterConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): BananaRouterConfig | null {
  return getEnvBananaRouterConfig(env);
}

function extractCandidateText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";
  const texts: string[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== "object") continue;
    const parts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") texts.push(text);
    }
  }
  return texts.join("\n").trim();
}

export async function callBananaRouterText(
  opts: BananaRouterTextOptions,
  dependencies: BananaRouterDependencies = {}
): Promise<string> {
  const resolved: A100ResolvedCredential = dependencies.config
    ? { ...dependencies.config, source: "env" }
    : dependencies.resolveConfig
      ? await dependencies.resolveConfig()
      : await resolveA100Credential();
  const config: BananaRouterConfig = resolved;

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 50_000);
  const endpoint = `${config.baseURL}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  const startedAt = Date.now();
  let eventStatus: "success" | "error" = "error";
  let errorCategory: string | null = "network_error";

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: opts.temperature ?? 0.6,
          maxOutputTokens: opts.maxTokens ?? 3000,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      errorCategory =
        response.status === 401 || response.status === 403
          ? "unauthorized"
          : response.status === 429
            ? "rate_limited"
            : "provider_error";
      throw new Error(`BananaRouter 请求失败（HTTP ${response.status}）`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      errorCategory = "invalid_response";
      throw new Error("BananaRouter 返回了无效 JSON");
    }
    const content = extractCandidateText(payload);
    if (!content) {
      errorCategory = "invalid_response";
      throw new Error("BananaRouter 返回内容为空");
    }
    eventStatus = "success";
    errorCategory = null;
    return content;
  } catch (error) {
    if (controller.signal.aborted) {
      errorCategory = "timeout";
      throw new Error("BananaRouter 请求超时");
    }
    if (error instanceof Error && error.message.startsWith("BananaRouter")) {
      throw error;
    }
    errorCategory = "network_error";
    throw new Error("BananaRouter 请求失败");
  } finally {
    clearTimeout(timer);
    if (
      resolved.source === "hub" &&
      resolved.bindingId != null &&
      resolved.credentialVersion != null
    ) {
      const event: A100CredentialEvent = {
        bindingId: resolved.bindingId,
        credentialVersion: resolved.credentialVersion,
        status: eventStatus,
        latencyMs: Math.max(0, Date.now() - startedAt),
        errorCategory,
      };
      try {
        await (dependencies.reportEvent ?? reportA100CredentialEvent)(event);
      } catch {
        // 事件上报失败不能覆盖业务请求的成功或原始错误。
      }
    }
  }
}
