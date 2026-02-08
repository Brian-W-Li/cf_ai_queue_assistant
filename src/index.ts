

import { QueueDO } from "./queue_do";
export { QueueDO };

// Known-good model from Cloudflare docs:
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

type AIAction =
  | { action: "enqueue"; payload: string }
  | { action: "list" }
  | { action: "work" };

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = (await request.json()) as { message?: string };
      const message = (body.message ?? "").trim();

      const id = env.QUEUE.idFromName("global-queue");
      const queue = env.QUEUE.get(id);

      const direct = await handleDirect(message, queue);
      if (direct !== null) return json({ reply: direct });

      const action = await parseWithAI(env, message);

      if (!action) {
        return json({
          reply: 'Try: "enqueue <text>", "list", "work" (or ask in plain English)',
        });
      }

      if (action.action === "enqueue") {
        const res = await queue.fetch("https://queue/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: action.payload }),
        });
        const data = await res.json();
        return json({ reply: `enqueued job ${data.job.id}` });
      }

      if (action.action === "list") {
        const res = await queue.fetch("https://queue/list");
        const data = await res.json();
        return json({ reply: JSON.stringify(data.jobs, null, 2) });
      }

      if (action.action === "work") {
        const res = await queue.fetch("https://queue/work", { method: "POST" });
        const data = await res.json();
        return json({ reply: JSON.stringify(data, null, 2) });
      }

      return json({ reply: "AI returned an unknown action." });
    }

    // index.html
    if (request.method === "GET" && url.pathname === "/") {
      const u = new URL(request.url);
      u.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(u, request));
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleDirect(message: string, queue: any): Promise<string | null> {
  if (!message) return "try: enqueue <text>, list, work";

  if (message.startsWith("enqueue")) {
    const payload = message.slice("enqueue".length).trim();
    const res = await queue.fetch("https://queue/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const data = await res.json();
    return `enqueued job ${data.job.id}`;
  }

  if (message === "list") {
    const res = await queue.fetch("https://queue/list");
    const data = await res.json();
    return JSON.stringify(data.jobs, null, 2);
  }

  if (message === "work") {
    const res = await queue.fetch("https://queue/work", { method: "POST" });
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  }

  return null;
}

async function parseWithAI(env: any, userText: string): Promise<AIAction | null> {
  // If AI isn’t available, fail
  if (!env.AI || typeof env.AI.run !== "function") return null;

  try {
    const prompt = [
      "Convert the user message into EXACT JSON with one of these shapes:",
      '{"action":"enqueue","payload":"..."}',
      '{"action":"list"}',
      '{"action":"work"}',
      "If the user is unclear, output: null",
      "",
      "User message:",
      userText,
    ].join("\n");

    const resp = await env.AI.run(MODEL, { prompt });

    const text = (resp?.response ?? resp?.result ?? "").toString().trim();
    if (!text || text === "null") return null;

    const obj = JSON.parse(text);

    if (obj?.action === "enqueue" && typeof obj.payload === "string") {
      return { action: "enqueue", payload: obj.payload };
    }
    if (obj?.action === "list") return { action: "list" };
    if (obj?.action === "work") return { action: "work" };

    return null;
  } catch {
    return null;
  }
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}