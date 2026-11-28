import { describe, expect, it } from "vitest";
import { type GraphService, buildServiceGraph } from "./service-graph";

const services: GraphService[] = [
  { id: "nginx", name: "Reverse Proxy Server", type: "system", internetAccess: true, devices: [] },
  { id: "tunnel", name: "Cloudflare Tunnel", type: "system", internetAccess: true, devices: [] },
  { id: "app", name: "App", type: "github", internetAccess: false, devices: [] },
  { id: "db", name: "Postgres", type: "dockerhub", internetAccess: false, devices: [] },
];

const edgeIds = (graph: ReturnType<typeof buildServiceGraph>) => graph.edges.map(edge => [edge.sourceId, edge.targetId]);

describe("buildServiceGraph", () => {
  it("should leave out the system services other than nginx", () => {
    const graph = buildServiceGraph(services, [], "nginx");
    expect(graph.nodes.map(node => node.id)).toEqual(["nginx", "app", "db"]);
    expect(graph.nodes.find(node => node.id === "nginx")?.kind).toBe("reverse-proxy");
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

  it("should connect the services that have internet access to an internet node", () => {
    const withInternet = services.map(service => (service.id === "app" ? { ...service, internetAccess: true } : service));
    const graph = buildServiceGraph(withInternet, [], "nginx");
    expect(graph.nodes.map(node => node.id)).toEqual(["nginx", "app", "db", "internet"]);
    expect(graph.edges).toEqual([{ id: "app:internet", sourceId: "app", targetId: "internet", kind: "access" }]);
  });

  it("should connect the services that use a device kind to its node", () => {
    const printer = { kind: "usb-printer" as const };
    const withDevices = services.map(service => (service.type === "system" ? service : { ...service, devices: [printer] }));
    const graph = buildServiceGraph(withDevices, [], "nginx");
    const deviceNode = graph.nodes.find(node => node.id === "device:usb-printer");
    expect(deviceNode).toMatchObject({ kind: "device", deviceKind: "usb-printer" });
    expect(edgeIds(graph)).toEqual([["app", "device:usb-printer"], ["db", "device:usb-printer"]]);
  });

  it("should leave out the internet and device nodes when no service uses them", () => {
    const graph = buildServiceGraph(services, [], "nginx");
    expect(graph.nodes.some(node => node.kind === "internet" || node.kind === "device")).toBe(false);
  });

  it("should give the same layout for the same data", () => {
    const first = buildServiceGraph(services, [{ serviceAId: "app", serviceBId: "db" }], "nginx");
    const second = buildServiceGraph(services, [{ serviceAId: "app", serviceBId: "db" }], "nginx");
    expect(second.nodes).toEqual(first.nodes);
    expect(new Set(first.nodes.map(node => `${node.x},${node.y}`)).size).toBe(3);
  });
});
