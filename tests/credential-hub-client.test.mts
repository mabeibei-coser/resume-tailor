import assert from "node:assert/strict";
import test from "node:test";

import {
  reportA100CredentialEvent,
  resetCredentialClientForTests,
  resolveA100Credential,
} from "../lib/credential-hub-client.ts";
import type { A100CredentialEvent } from "../lib/credential-hub-client.ts";

const TOKEN = "cph_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg";

function hubEnv(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string | undefined>> {
  return {
    CREDENTIAL_MODE: "hub",
    CREDENTIAL_HUB_URL: "http://127.0.0.1:3004/b100",
    CREDENTIAL_HUB_TOKEN: TOKEN,
    CREDENTIAL_ENV_FALLBACK: "false",
    ...overrides,
  };
}

function hubPayload(version: number, apiKey: string) {
  return {
    projectId: "A100",
    credentials: [
      {
        bindingId: 7,
        credentialVersion: version,
        provider: "bananarouter",
        capability: "resume_text",
        role: "primary",
        protocol: "gemini-native",
        endpoint: "https://api.bananarouter.com",
        model: "gemini-3.1-flash-lite",
        apiKey,
        resolvedAt: 123,
      },
    ],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("env 模式保持兼容且不访问凭证中心", async () => {
  resetCredentialClientForTests();
  let calls = 0;
  const credential = await resolveA100Credential({
    env: {
      CREDENTIAL_MODE: "env",
      BANANAROUTER_API_KEY: "legacy-env-test-key",
      BANANAROUTER_BASE_URL: "https://api.bananarouter.com/",
      BANANAROUTER_MODEL: "gemini-3.1-flash-lite",
    },
    fetchImpl: (async () => {
      calls += 1;
      throw new Error("should not fetch");
    }) as typeof fetch,
  });
  assert.equal(credential.source, "env");
  assert.equal(credential.baseURL, "https://api.bananarouter.com");
  assert.equal(calls, 0);
});

test("hub 60 秒缓存并在版本变化后自动换配置", async () => {
  resetCredentialClientForTests();
  let now = 1_000;
  let version = 1;
  let calls = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    assert.equal(
      String(input),
      "http://127.0.0.1:3004/b100/api/internal/credentials/resolve/?project=A100",
    );
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${TOKEN}`);
    assert.equal(init?.redirect, "error");
    return jsonResponse(hubPayload(version, `hub-version-${version}-test-key`));
  }) as typeof fetch;

  const first = await resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now });
  now += 59_999;
  const cached = await resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now });
  version = 2;
  now += 1;
  const refreshed = await resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now });

  assert.equal(first.credentialVersion, 1);
  assert.equal(cached.credentialVersion, 1);
  assert.equal(refreshed.credentialVersion, 2);
  assert.equal(refreshed.apiKey, "hub-version-2-test-key");
  assert.equal(calls, 2);
});

test("运行中 hub 故障沿用 24 小时内存旧值，超期后安全失败", async () => {
  resetCredentialClientForTests();
  let now = 10_000;
  let failing = false;
  const fetchImpl = (async () => {
    if (failing) throw new Error("hub unavailable");
    return jsonResponse(hubPayload(3, "cached-hub-test-key"));
  }) as typeof fetch;

  const first = await resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now });
  failing = true;
  now += 60_000;
  const stale = await resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now });
  assert.equal(stale.apiKey, first.apiKey);

  now = 10_000 + 24 * 60 * 60 * 1000 + 1;
  await assert.rejects(
    resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => now }),
    /无可用凭证/,
  );
});

test("并发刷新只请求一次凭证中心", async () => {
  resetCredentialClientForTests();
  let calls = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetchImpl = (async () => {
    calls += 1;
    await gate;
    return jsonResponse(hubPayload(8, "single-flight-hub-test-key"));
  }) as typeof fetch;

  const requests = Array.from({ length: 10 }, () =>
    resolveA100Credential({ env: hubEnv(), fetchImpl, now: () => 50_000 }),
  );
  release?.();
  const credentials = await Promise.all(requests);

  assert.equal(calls, 1);
  assert.ok(credentials.every((credential) => credential.credentialVersion === 8));
});

for (const rejectedStatus of [401, 403, 404, 410]) {
  test(`中心 ${rejectedStatus} 明确拒绝时不允许旧缓存或 env 兜底绕过`, async () => {
    resetCredentialClientForTests();
    let now = 100_000;
    let status = 200;
    const fetchImpl = (async () =>
      status === 200
        ? jsonResponse(hubPayload(9, "authoritative-hub-test-key"))
        : jsonResponse({ error: "unauthorized" }, status)) as typeof fetch;
    const env = hubEnv({
      CREDENTIAL_ENV_FALLBACK: "true",
      BANANAROUTER_API_KEY: "must-not-bypass-with-env-key",
    });

    await resolveA100Credential({ env, fetchImpl, now: () => now });
    now += 60_000;
    status = rejectedStatus;

    await assert.rejects(
      resolveA100Credential({ env, fetchImpl, now: () => now }),
      /拒绝提供凭证/,
    );
  });
}

test("冷启动 hub 失败：关闭兜底时失败，显式开启时才读取 env", async () => {
  const failedFetch = (async () => {
    throw new Error("hub unavailable");
  }) as typeof fetch;

  resetCredentialClientForTests();
  await assert.rejects(
    resolveA100Credential({ env: hubEnv(), fetchImpl: failedFetch }),
    /无可用凭证/,
  );

  resetCredentialClientForTests();
  const fallback = await resolveA100Credential({
    env: hubEnv({
      CREDENTIAL_ENV_FALLBACK: "true",
      BANANAROUTER_API_KEY: "explicit-env-fallback-key",
    }),
    fetchImpl: failedFetch,
  });
  assert.equal(fallback.source, "env");
  assert.equal(fallback.apiKey, "explicit-env-fallback-key");
});

test("错误绑定配置和非本机 hub URL 均被拒绝", async () => {
  resetCredentialClientForTests();
  await assert.rejects(
    resolveA100Credential({
      env: hubEnv({ CREDENTIAL_HUB_URL: "https://evil.example/b100" }),
      fetchImpl: (async () => jsonResponse(hubPayload(1, "never-send-test-key"))) as typeof fetch,
    }),
    /无可用凭证/,
  );

  resetCredentialClientForTests();
  await assert.rejects(
    resolveA100Credential({
      env: hubEnv(),
      fetchImpl: (async () => {
        const payload = hubPayload(1, "wrong-endpoint-test-key");
        payload.credentials[0].endpoint = "https://evil.example";
        return jsonResponse(payload);
      }) as typeof fetch,
    }),
    /拒绝提供凭证/,
  );

  resetCredentialClientForTests();
  await assert.rejects(
    resolveA100Credential({
      env: hubEnv(),
      fetchImpl: (async () => {
        const payload = hubPayload(1, "wrong-model-test-key");
        payload.credentials[0].model = "text-only-wrong-model";
        return jsonResponse(payload);
      }) as typeof fetch,
    }),
    /拒绝提供凭证/,
  );
});

test("事件上报只发送允许字段，失败不抛给业务", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const capturedBodies: string[] = [];
  await reportA100CredentialEvent(
    {
      bindingId: 7,
      credentialVersion: 2,
      status: "success",
      latencyMs: 234,
      errorCategory: null,
    },
    {
      env: hubEnv(),
      fetchImpl: (async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        capturedBodies.push(String(init?.body));
        return jsonResponse({ ok: true }, 201);
      }) as typeof fetch,
    },
  );
  assert.equal(
    capturedUrl,
    "http://127.0.0.1:3004/b100/api/internal/credentials/events/",
  );
  assert.equal(new Headers(capturedInit?.headers).get("Authorization"), `Bearer ${TOKEN}`);
  assert.equal(capturedInit?.cache, "no-store");
  const body = JSON.parse(capturedBodies[0]);
  assert.deepEqual(Object.keys(body).sort(), [
    "bindingId",
    "credentialVersion",
    "errorCategory",
    "latencyMs",
    "status",
  ]);
  assert.equal(JSON.stringify(body).match(/prompt|image|audio|apiKey|userContent/), null);

  await reportA100CredentialEvent(
    {
      bindingId: 7,
      credentialVersion: 2,
      status: "success",
      latencyMs: 234,
      errorCategory: null,
      apiKey: "polluted-event-secret",
      prompt: "polluted-user-content",
    } as A100CredentialEvent & { apiKey: string; prompt: string },
    {
      env: hubEnv(),
      fetchImpl: (async (_input, init) => {
        capturedBodies.push(String(init?.body));
        return jsonResponse({ ok: true }, 201);
      }) as typeof fetch,
    },
  );
  assert.equal(capturedBodies[1].match(/polluted-event-secret|polluted-user-content/), null);

  await assert.doesNotReject(
    reportA100CredentialEvent(
      {
        bindingId: 7,
        credentialVersion: 2,
        status: "error",
        latencyMs: 1,
        errorCategory: "timeout",
      },
      {
        env: hubEnv(),
        fetchImpl: (async () => {
          throw new Error("event endpoint unavailable");
        }) as typeof fetch,
      },
    ),
  );
});
