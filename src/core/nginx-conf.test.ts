import { describe, expect, it } from "vitest";
import { generateProxyConfig } from "./nginx-conf";

describe("generateProxyConfig", () => {
  const app = { hostname: "app.example.com", host: "service-a", port: 3000 };
  const api = { hostname: "api.example.com", host: "service-b", port: 8080 };

  it("should keep the health check and answer unknown hostnames with a 404", () => {
    const config = generateProxyConfig([]);
    expect(config.match(/server \{/g)).toHaveLength(1);
    expect(config).toContain("listen 80 default_server;");
    expect(config).toMatch(/location \/healthz \{[^}]*return 200 "healthy\\n";/);
    expect(config).toMatch(/location \/ \{\s*return 404;\s*\}/);
  });

  it("should generate one server per hostname", () => {
    const config = generateProxyConfig([app, api]);
    expect(config.match(/server \{/g)).toHaveLength(3);
    expect(config.match(/default_server/g)).toHaveLength(2);
    expect(config).toMatch(/server_name app\.example\.com;[^}]*"service-a:3000";/);
    expect(config).toMatch(/server_name api\.example\.com;[^}]*"service-b:8080";/);
  });

  it("should not need the services to be running", () => {
    const config = generateProxyConfig([app]);
    expect(config).toContain("resolver 127.0.0.11 valid=5s ipv6=off;");
    expect(config).toContain("set $upstream \"service-a:3000\";");
    expect(config).toContain("proxy_pass http://$upstream;");
    expect(config).not.toContain("proxy_pass http://service-a");
  });

  it("should tell the apps about the original request", () => {
    const config = generateProxyConfig([app]);
    expect(config).toContain("proxy_set_header Host $host;");
    expect(config).toContain("proxy_set_header X-Forwarded-Proto https;");
    expect(config).toContain("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
  });

  it("should support WebSockets", () => {
    const config = generateProxyConfig([app]);
    expect(config).toContain("proxy_http_version 1.1;");
    expect(config).toContain("proxy_set_header Upgrade $http_upgrade;");
    expect(config).toContain("proxy_set_header Connection $connection_upgrade;");
    expect(config).toContain("map $http_upgrade $connection_upgrade {");
  });

  it("should proxy the domain of the dashboard to the host", () => {
    const config = generateProxyConfig([app], { hostname: "buttler.example.com", port: 2083 });
    expect(config.match(/server \{/g)).toHaveLength(3);
    expect(config).toMatch(/server_name buttler\.example\.com;[^}]*proxy_pass http:\/\/host\.docker\.internal:2083;/);
    expect(config).toMatch(/server_name app\.example\.com;[^}]*"service-a:3000";/);
  });

  it("should not buffer the dashboard", () => {
    const config = generateProxyConfig([], { hostname: "buttler.example.com", port: 2083 });
    expect(config).toMatch(/server_name buttler\.example\.com;[^}]*proxy_buffering off;/);
  });

  it("should not serve the dashboard without a domain", () => {
    expect(generateProxyConfig([app])).not.toContain("host.docker.internal");
  });
});
