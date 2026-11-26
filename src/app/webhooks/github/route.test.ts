import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  startBuilding: vi.fn(),
  getSetting: vi.fn(),
  getServicesByBranch: vi.fn(),
  getDeployableService: vi.fn(),
  isServiceDeleting: vi.fn(),
}));

vi.mock("~/core/build", () => ({ startBuilding: mocks.startBuilding }));
vi.mock("~/core/docker/status", () => ({ isServiceDeleting: mocks.isServiceDeleting }));
vi.mock("~/core/settings", () => ({ getSetting: mocks.getSetting }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getServicesByBranch", () => ({ default: mocks.getServicesByBranch }));
vi.mock("~/operations/getDeployableService", () => ({ default: mocks.getDeployableService }));

const secret = "whsec";
const push = {
  ref: "refs/heads/feat/a",
  deleted: false,
  repository: { full_name: "acme/app" },
  head_commit: { id: "abcdef" },
};

function send(payload: unknown, headers: Record<string, string> = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return POST(new Request("http://localhost/webhooks/github", {
    method: "POST",
    body,
    headers: {
      "x-github-delivery": "delivery-id",
      "x-github-event": "push",
      "x-hub-signature-256": `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`,
      ...headers,
    },
  }));
}

describe("POST /webhooks/github", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getSetting.mockResolvedValue(secret);
    mocks.getServicesByBranch.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    mocks.getDeployableService.mockImplementation((_, id: string) => Promise.resolve({ id }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject deliveries when there is no secret", async () => {
    mocks.getSetting.mockResolvedValue(null);
    expect((await send(push)).status).toBe(503);
    expect(mocks.startBuilding).not.toHaveBeenCalled();
  });

  it("should reject invalid signatures", async () => {
    expect((await send(push, { "x-hub-signature-256": "sha256=abc" })).status).toBe(401);
    expect(mocks.getServicesByBranch).not.toHaveBeenCalled();
  });

  it("should reject malformed requests", async () => {
    expect((await send("not json")).status).toBe(400);
    expect((await send({ ref: "refs/heads/main" })).status).toBe(400);
    expect((await send(push, { "x-github-event": "" })).status).toBe(400);
  });

  it("should respond to pings and ignore other events", async () => {
    const response = await send({}, { "x-github-event": "ping" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "pong" });
    expect((await send({}, { "x-github-event": "issues" })).status).toBe(200);
    expect(mocks.getServicesByBranch).not.toHaveBeenCalled();
  });

  it("should ignore tags and deleted branches", async () => {
    expect((await send({ ...push, ref: "refs/tags/v1" })).status).toBe(200);
    expect((await send({ ...push, deleted: true, head_commit: null })).status).toBe(200);
    expect(mocks.getServicesByBranch).not.toHaveBeenCalled();
  });

  it("should ignore branches that are not deployed", async () => {
    mocks.getServicesByBranch.mockResolvedValue([]);
    expect((await send(push)).status).toBe(200);
    expect(mocks.startBuilding).not.toHaveBeenCalled();
  });

  it("should build the matching services", async () => {
    expect((await send(push)).status).toBe(202);
    expect(mocks.getServicesByBranch).toHaveBeenCalledWith({}, "acme/app", "feat/a");
    expect(mocks.startBuilding.mock.calls).toEqual([[{ id: "a" }], [{ id: "b" }]]);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("delivery-id"));
  });

  it("should build the other services when one fails to start", async () => {
    mocks.getDeployableService.mockRejectedValueOnce(new Error("boom"));
    expect((await send(push)).status).toBe(202);
    expect(mocks.startBuilding.mock.calls).toEqual([[{ id: "b" }]]);
    expect(console.error).toHaveBeenCalled();
  });

  it("should skip the services that are being deleted", async () => {
    mocks.isServiceDeleting.mockImplementation((id: string) => id === "a");
    expect((await send(push)).status).toBe(202);
    expect(mocks.startBuilding.mock.calls).toEqual([[{ id: "b" }]]);
  });

  it("should report when no build could be started", async () => {
    mocks.getDeployableService.mockResolvedValue(null);
    expect((await send(push)).status).toBe(500);
  });
});
