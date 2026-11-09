import { describe, expect, it } from "vitest";
import { generateBaselineProxyConfig } from "./nginx-conf";

describe("generateBaselineProxyConfig", () => {
  it("generates a baseline reverse proxy configuration with health check and default location", () => {
    const config = generateBaselineProxyConfig();
    expect(config).toContain("listen 80 default_server;");
    expect(config).toContain("location /healthz");
    expect(config).toContain("location /");
    expect(config).toContain("Buttler Reverse Proxy is running");
  });
});
