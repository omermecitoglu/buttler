import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LogLine, isContainerRunning, readContainerLogs } from "~/core/docker/logs";
import { findServiceContainer } from "~/core/docker/status";
import { getSession } from "~/core/session";
import { getSingleService } from "~/data/services";
import { GET } from "./route";
import type { NextRequest } from "next/server";

vi.mock("~/core/session", () => ({ getSession: vi.fn() }));
vi.mock("~/data/services", () => ({ getSingleService: vi.fn() }));
vi.mock("~/core/docker/status", () => ({ findServiceContainer: vi.fn() }));
vi.mock("~/core/docker/logs", async importOriginal => ({
  ...await importOriginal<object>(),
  readContainerLogs: vi.fn(),
  isContainerRunning: vi.fn(),
}));

const line: LogLine = { stream: "stdout", timestamp: "2026-11-24T10:00:00.100000000Z", text: "hello" };

function request(query = "", headers: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/services/service-id/logs/stream${query}`);
  return Object.assign(new Request(url, { headers }), { nextUrl: url }) as unknown as NextRequest;
}

const context = { params: Promise.resolve({ id: "service-id" }) };

describe("GET /api/services/[id]/logs/stream", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof getSession>>);
    vi.mocked(getSingleService).mockResolvedValue({ id: "service-id" } as Awaited<ReturnType<typeof getSingleService>>);
    vi.mocked(findServiceContainer).mockResolvedValue({} as Awaited<ReturnType<typeof findServiceContainer>>);
    vi.mocked(isContainerRunning).mockResolvedValue(false);
    vi.mocked(readContainerLogs).mockImplementation(async function * () {
      yield await Promise.resolve([line]);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should reject the requests without a session", async () => {
    vi.mocked(getSession).mockResolvedValue({} as Awaited<ReturnType<typeof getSession>>);
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expect(findServiceContainer).not.toHaveBeenCalled();
  });

  it("should return 404 when the service doesn't exist", async () => {
    vi.mocked(getSingleService).mockResolvedValue(null);
    expect((await GET(request(), context)).status).toBe(404);
  });

  it("should return 404 when the service doesn't have a container", async () => {
    vi.mocked(findServiceContainer).mockResolvedValue(null);
    expect((await GET(request(), context)).status).toBe(404);
  });

  it("should stream the lines and the end of the logs", async () => {
    const response = await GET(request(), context);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    const content = await response.text();
    expect(content).toContain(`id: ${line.timestamp}\ndata: ${JSON.stringify([line])}\n\n`);
    expect(content).toContain("event: end\ndata: {\"running\":false}\n\n");
  });

  it("should report failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line require-yield
    vi.mocked(readContainerLogs).mockImplementation(async function * () {
      await Promise.reject(new Error("Docker is down"));
    });
    const response = await GET(request(), context);
    await expect(response.text()).resolves.toContain("event: failure\n");
  });

  it("should limit the tail and ignore invalid values", async () => {
    await GET(request("?tail=100&since=nonsense"), context);
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1]).toMatchObject({ tail: 100, since: null });
    await GET(request("?since=2026-11-24"), context);
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1]).toMatchObject({ since: null });
    await GET(request("?tail=999999"), context);
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1]).toMatchObject({ tail: 2000 });
    await GET(request("?tail=abc"), context);
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1]).toMatchObject({ tail: 500 });
  });

  it("should resume from the last event of the browser", async () => {
    await GET(request("?since=2026-11-24T09:00:00Z", { "last-event-id": "2026-11-24T10:00:00Z" }), context);
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1]).toMatchObject({ since: "2026-11-24T10:00:00Z" });
  });

  it("should stop reading when the browser disconnects", async () => {
    const response = await GET(request(), context);
    await response.body?.cancel();
    expect(vi.mocked(readContainerLogs).mock.lastCall?.[1].signal.aborted).toBe(true);
  });
});
