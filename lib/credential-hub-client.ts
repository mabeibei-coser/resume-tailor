const PROJECT_ID = "A100";
const CAPABILITY = "resume_text";
const PROVIDER = "bananarouter";
const PROTOCOL = "gemini-native";
const BANANAROUTER_ENDPOINT = "https://api.bananarouter.com";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const REFRESH_MS = 60_000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type RuntimeEnv = Readonly<Record<string, string | undefined>>;

export interface A100ResolvedCredential {
  apiKey: string;
  baseURL: string;
  model: string;
  source: "hub" | "env";
  bindingId?: number;
  credentialVersion?: number;
}

export interface A100CredentialEvent {
  bindingId: number;
  credentialVersion: number;
  status: "success" | "error";
  latencyMs: number;
  errorCategory: string | null;
}

interface HubCredential {
  bindingId: unknown;
  credentialVersion: unknown;
  provider: unknown;
  capability: unknown;
  role: unknown;
  protocol: unknown;
  endpoint: unknown;
  model: unknown;
  apiKey: unknown;
  resolvedAt: unknown;
}

interface CacheEntry {
  identity: string;
  credential: A100ResolvedCredential;
  fetchedAt: number;
}

interface ResolveOptions {
  env?: RuntimeEnv;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

interface ReportOptions {
  env?: RuntimeEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

let cache: CacheEntry | null = null;
let refreshInFlight:
  | { identity: string; promise: Promise<A100ResolvedCredential> }
  | null = null;

class CredentialHubResponseError extends Error {
  readonly authoritative: boolean;

  constructor(authoritative: boolean) {
    super("凭证中心取件失败");
    this.authoritative = authoritative;
  }
}

function getEnvCredential(env: RuntimeEnv): A100ResolvedCredential | null {
  const apiKey = env.BANANAROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: (env.BANANAROUTER_BASE_URL ?? BANANAROUTER_ENDPOINT).replace(/\/+$/, ""),
    model: env.BANANAROUTER_MODEL?.trim() || DEFAULT_MODEL,
    source: "env",
  };
}

export function getEnvBananaRouterConfig(
  env: RuntimeEnv = process.env,
): Pick<A100ResolvedCredential, "apiKey" | "baseURL" | "model"> | null {
  const credential = getEnvCredential(env);
  if (!credential) return null;
  return {
    apiKey: credential.apiKey,
    baseURL: credential.baseURL,
    model: credential.model,
  };
}

function getHubRuntime(env: RuntimeEnv): {
  baseURL: string;
  token: string;
  identity: string;
} {
  const rawURL = env.CREDENTIAL_HUB_URL?.trim();
  const token = env.CREDENTIAL_HUB_TOKEN?.trim();
  if (!rawURL || !token) throw new Error("凭证中心配置不完整");
  if (!/^cph_[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("凭证中心配置无效");
  }
  let url: URL;
  try {
    url = new URL(rawURL);
  } catch {
    throw new Error("凭证中心配置无效");
  }
  const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (
    !new Set(["http:", "https:"]).has(url.protocol) ||
    !loopback.has(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("凭证中心配置无效");
  }
  const baseURL = url.toString().replace(/\/+$/, "");
  return { baseURL, token, identity: `${baseURL}\u0000${token}` };
}

function parseHubCredential(payload: unknown): A100ResolvedCredential {
  if (!payload || typeof payload !== "object") {
    throw new CredentialHubResponseError(true);
  }
  const body = payload as { projectId?: unknown; credentials?: unknown };
  if (body.projectId !== PROJECT_ID || !Array.isArray(body.credentials)) {
    throw new CredentialHubResponseError(true);
  }
  const matches = body.credentials.filter((item): item is HubCredential => {
    if (!item || typeof item !== "object") return false;
    const value = item as HubCredential;
    return value.capability === CAPABILITY && value.role === "primary";
  });
  if (matches.length !== 1) throw new CredentialHubResponseError(true);
  const credential = matches[0];
  if (
    credential.provider !== PROVIDER ||
    credential.protocol !== PROTOCOL ||
    credential.endpoint !== BANANAROUTER_ENDPOINT ||
    !Number.isSafeInteger(credential.bindingId) ||
    Number(credential.bindingId) <= 0 ||
    !Number.isSafeInteger(credential.credentialVersion) ||
    Number(credential.credentialVersion) <= 0 ||
    credential.model !== DEFAULT_MODEL ||
    typeof credential.apiKey !== "string" ||
    credential.apiKey.length < 16 ||
    credential.apiKey.length > 4096 ||
    !Number.isSafeInteger(credential.resolvedAt) ||
    Number(credential.resolvedAt) <= 0
  ) {
    throw new CredentialHubResponseError(true);
  }
  return {
    apiKey: credential.apiKey,
    baseURL: credential.endpoint,
    model: credential.model,
    source: "hub",
    bindingId: Number(credential.bindingId),
    credentialVersion: Number(credential.credentialVersion),
  };
}

async function fetchHubCredential(
  runtime: ReturnType<typeof getHubRuntime>,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<A100ResolvedCredential> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${runtime.baseURL}/api/internal/credentials/resolve/?project=${PROJECT_ID}`,
      {
        method: "GET",
        redirect: "error",
        cache: "no-store",
        headers: { Authorization: `Bearer ${runtime.token}` },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const transient = response.status === 429 || response.status >= 500;
      throw new CredentialHubResponseError(!transient);
    }
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new CredentialHubResponseError(true);
    }
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) {
      throw new CredentialHubResponseError(true);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new CredentialHubResponseError(false);
    }
    return parseHubCredential(payload);
  } catch (error) {
    if (error instanceof CredentialHubResponseError) throw error;
    throw new CredentialHubResponseError(false);
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveA100Credential(
  options: ResolveOptions = {},
): Promise<A100ResolvedCredential> {
  const env = options.env ?? process.env;
  const mode = env.CREDENTIAL_MODE?.trim().toLowerCase() || "env";
  if (mode === "env") {
    const credential = getEnvCredential(env);
    if (!credential) throw new Error("BananaRouter 未配置");
    return credential;
  }
  if (mode !== "hub") throw new Error("凭证模式配置无效");

  const now = options.now?.() ?? Date.now();
  const allowEnvFallback = env.CREDENTIAL_ENV_FALLBACK === "true";
  let runtime: ReturnType<typeof getHubRuntime>;
  try {
    runtime = getHubRuntime(env);
  } catch {
    const fallback = allowEnvFallback ? getEnvCredential(env) : null;
    if (fallback) return fallback;
    throw new Error("凭证中心不可用且无可用凭证");
  }

  if (
    cache?.identity === runtime.identity &&
    now - cache.fetchedAt < REFRESH_MS
  ) {
    return { ...cache.credential };
  }

  try {
    if (!refreshInFlight || refreshInFlight.identity !== runtime.identity) {
      refreshInFlight = {
        identity: runtime.identity,
        promise: fetchHubCredential(
          runtime,
          options.fetchImpl ?? fetch,
          options.timeoutMs ?? 3_000,
        ),
      };
    }
    const credential = await refreshInFlight.promise;
    cache = { identity: runtime.identity, credential, fetchedAt: now };
    return { ...credential };
  } catch (error) {
    if (error instanceof CredentialHubResponseError && error.authoritative) {
      throw new Error("凭证中心拒绝提供凭证");
    }
    if (
      cache?.identity === runtime.identity &&
      now - cache.fetchedAt <= MAX_STALE_MS
    ) {
      return { ...cache.credential };
    }
    const fallback = allowEnvFallback ? getEnvCredential(env) : null;
    if (fallback) return fallback;
    throw new Error("凭证中心不可用且无可用凭证");
  } finally {
    if (refreshInFlight?.identity === runtime.identity) refreshInFlight = null;
  }
}

export async function reportA100CredentialEvent(
  event: A100CredentialEvent,
  options: ReportOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
  let runtime: ReturnType<typeof getHubRuntime>;
  try {
    runtime = getHubRuntime(env);
  } catch {
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2_000);
  const body: A100CredentialEvent = {
    bindingId: event.bindingId,
    credentialVersion: event.credentialVersion,
    status: event.status,
    latencyMs: event.latencyMs,
    errorCategory: event.errorCategory,
  };
  try {
    await (options.fetchImpl ?? fetch)(
      `${runtime.baseURL}/api/internal/credentials/events/`,
      {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${runtime.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch {
    // 事件上报不能影响用户正在进行的简历分析。
  } finally {
    clearTimeout(timer);
  }
}

export function resetCredentialClientForTests(): void {
  cache = null;
  refreshInFlight = null;
}
