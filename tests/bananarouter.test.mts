import test from "node:test";
import assert from "node:assert/strict";

import {
  callBananaRouterText,
  getBananaRouterConfig,
} from "../lib/bananarouter.ts";
import type { A100CredentialEvent } from "../lib/credential-hub-client.ts";

const config = {
  apiKey: "test-key-not-a-secret",
  baseURL: "https://example.test",
  model: "gemini-test",
};

test("缺少 key 时不启用 BananaRouter", () => {
  assert.equal(getBananaRouterConfig({}), null);
});

test("使用 Gemini 原生 generateContent 合同并提取文本", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const text = await callBananaRouterText(
    { systemPrompt: "system", userPrompt: "user", maxTokens: 32 },
    { config, fetchImpl }
  );

  assert.equal(
    capturedUrl,
    "https://example.test/v1beta/models/gemini-test:generateContent"
  );
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key-not-a-secret");
  const body = JSON.parse(String(capturedInit?.body));
  assert.equal(body.systemInstruction.parts[0].text, "system");
  assert.equal(body.contents[0].parts[0].text, "user");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(text, '{"ok":true}');
});

test("上游错误不泄露响应正文或 key", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response('{"error":"SECRET_SHOULD_NOT_LEAK"}', { status: 400 });

  await assert.rejects(
    callBananaRouterText(
      { systemPrompt: "system", userPrompt: "user" },
      { config, fetchImpl }
    ),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /HTTP 400/);
      assert.doesNotMatch(message, /SECRET_SHOULD_NOT_LEAK|test-key/);
      return true;
    }
  );
});

test("空候选响应会安全失败", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response('{"candidates":[]}', { status: 200 });
  await assert.rejects(
    callBananaRouterText(
      { systemPrompt: "system", userPrompt: "user" },
      { config, fetchImpl }
    ),
    /返回内容为空/
  );
});

test("hub 凭证调用后只上报版本、状态和耗时", async () => {
  const events: A100CredentialEvent[] = [];
  const text = await callBananaRouterText(
    { systemPrompt: "system-sensitive", userPrompt: "user-sensitive" },
    {
      resolveConfig: async () => ({
        apiKey: "hub-call-test-key",
        baseURL: "https://api.bananarouter.com",
        model: "gemini-3.1-flash-lite",
        source: "hub",
        bindingId: 9,
        credentialVersion: 4,
      }),
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "OK" }] } }] }),
          { status: 200 },
        )) as typeof fetch,
      reportEvent: async (event) => {
        events.push(event);
      },
    },
  );
  assert.equal(text, "OK");
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]).sort(), [
    "bindingId",
    "credentialVersion",
    "errorCategory",
    "latencyMs",
    "status",
  ]);
  assert.equal(events[0].status, "success");
  assert.equal(JSON.stringify(events).match(/system-sensitive|user-sensitive|hub-call-test-key/), null);
});

test("hub 上游 401 上报 unauthorized，事件上报失败不覆盖原错误", async () => {
  const events: A100CredentialEvent[] = [];
  await assert.rejects(
    callBananaRouterText(
      { systemPrompt: "system", userPrompt: "user" },
      {
        resolveConfig: async () => ({
          apiKey: "hub-error-test-key",
          baseURL: "https://api.bananarouter.com",
          model: "gemini-3.1-flash-lite",
          source: "hub",
          bindingId: 9,
          credentialVersion: 5,
        }),
        fetchImpl: (async () => new Response("{}", { status: 401 })) as typeof fetch,
        reportEvent: async (reported) => {
          events.push(reported);
          throw new Error("event failed");
        },
      },
    ),
    /HTTP 401/,
  );
  assert.equal(events[0]?.status, "error");
  assert.equal(events[0]?.errorCategory, "unauthorized");
});
