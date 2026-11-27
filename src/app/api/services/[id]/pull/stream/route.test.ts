import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServicePullProgress, isServicePulling } from "~/core/docker/status";
import { GET } from "./route";

vi.mock("~/core/auth", () => ({ requireUser: vi.fn() }));
vi.mock("~/core/docker/status", () => ({
  isServicePulling: vi.fn(),
  getServicePullProgress: vi.fn(),
}));

const context = { params: Promise.resolve({ id: "service-id" }) };

function request() {
  return new Request("http://localhost/api/services/service-id/pull/stream");
}

describe("GET /api/services/[id]/pull/stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should end at once when the service isn't pulling", async () => {
    vi.mocked(isServicePulling).mockReturnValue(false);
    const response = await GET(request(), context);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await response.text()).toBe("event: end\ndata: {}\n\n");
  });

  it("should stream the progress until the pull is done", async () => {
    const first = { download: { current: 5, total: 10 }, extract: { current: 0, total: 10 } };
    const second = { download: { current: 10, total: 10 }, extract: { current: 4, total: 10 } };
    vi.mocked(isServicePulling)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    vi.mocked(getServicePullProgress)
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    const response = await GET(request(), context);
    const text = response.text();
    await vi.advanceTimersByTimeAsync(1500);
    expect(await text).toBe([
      `data: ${JSON.stringify(first)}\n\n`,
      ": waiting\n\n",
      `data: ${JSON.stringify(second)}\n\n`,
      "event: end\ndata: {}\n\n",
    ].join(""));
  });
});
