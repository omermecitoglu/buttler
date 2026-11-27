import { describe, expect, it } from "vitest";
import { type GraphService, buildServiceGraph } from "./service-graph";

const services: GraphService[] = [
  { id: "nginx", name: "Reverse Proxy Server", type: "system" },
  { id: "tunnel", name: "Cloudflare Tunnel", type: "system" },
  { id: "app", name: "App", type: "github" },
  { id: "db", name: "Postgres", type: "dockerhub" },
];

const edgeIds = (graph: ReturnType<typeof buildServiceGraph>) => graph.edges.map(edge => [edge.sourceId, edge.targetId]);

describe("buildServiceGraph", () => {
  it("should leave out the system services other than nginx", () => {
    const graph = buildServiceGraph(services, [], "nginx");
    expect(graph.nodes.map(node => node.id)).toEqual(["nginx", "app", "db"]);
    expect(graph.nodes.find(node => node.id === "nginx")?.isReverseProxy).toBe(true);
  });

  it("should connect the services of the links, nginx included", () => {
    const links = [{ serviceAId: "app", serviceBId: "db" }, { serviceAId: "app", serviceBId: "nginx" }];
    const graph = buildServiceGraph(services, links, "nginx");
    expect(edgeIds(graph)).toEqual([["app", "db"], ["app", "nginx"]]);
  });

  it("should skip the edges of services that aren't shown", () => {
    const graph = buildServiceGraph(services, [{ serviceAId: "app", serviceBId: "tunnel" }], null);
    expect(graph.nodes.map(node => node.id)).toEqual(["app", "db"]);
    expect(graph.edges).toEqual([]);
  });

  it("should give the same layout for the same data", () => {
    const first = buildServiceGraph(services, [{ serviceAId: "app", serviceBId: "db" }], "nginx");
    const second = buildServiceGraph(services, [{ serviceAId: "app", serviceBId: "db" }], "nginx");
    expect(second.nodes).toEqual(first.nodes);
    expect(new Set(first.nodes.map(node => `${node.x},${node.y}`)).size).toBe(3);
  });
});
