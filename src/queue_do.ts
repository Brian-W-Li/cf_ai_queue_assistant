import type { DurableObjectState } from "@cloudflare/workers-types";

type Job = {
  id: string;
  payload: string;
  status: "queued" | "done";
  createdAt: number;
  result?: string;
};

export class QueueDO {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // helpers
  private async getQueue(): Promise<string[]> {
    return (await this.state.storage.get<string[]>("queue")) ?? [];
  }

  private async setQueue(q: string[]) {
    await this.state.storage.put("queue", q);
  }

  private async getJobs(): Promise<Record<string, Job>> {
    return (await this.state.storage.get<Record<string, Job>>("jobs")) ?? {};
  }

  private async setJobs(j: Record<string, Job>) {
    await this.state.storage.put("jobs", j);
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // enqueue a job
    if (request.method === "POST" && url.pathname === "/enqueue") {
      const body = (await request.json()) as { payload?: string };

      const id = crypto.randomUUID();
      const job: Job = {
        id,
        payload: body.payload ?? "",
        status: "queued",
        createdAt: Date.now(),
      };

      const jobs = await this.getJobs();
      const queue = await this.getQueue();

      jobs[id] = job;
      queue.push(id);

      await this.setJobs(jobs);
      await this.setQueue(queue);

      return json({ job });
    }

    // list all jobs
    if (request.method === "GET" && url.pathname === "/list") {
      const jobs = await this.getJobs();
      return json({ jobs: Object.values(jobs) });
    }

    // process one job
    if (request.method === "POST" && url.pathname === "/work") {
      const jobs = await this.getJobs();
      const queue = await this.getQueue();

      const id = queue.shift();
      if (!id) return json({ message: "queue empty" });

      const job = jobs[id];
      if (!job) return json({ message: "job not found" });

      job.status = "done";
      job.result = "processed";
      jobs[id] = job;

      await this.setJobs(jobs);
      await this.setQueue(queue);

      return json({ job });
    }

    return new Response("Not Found", { status: 404 });
  }
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}