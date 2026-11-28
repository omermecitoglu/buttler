import {
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import type { DeviceKind } from "~/core/devices";

export type GraphService = {
  id: string,
  name: string,
  type: "github" | "dockerhub" | "system",
  internetAccess: boolean,
  devices: { kind: DeviceKind }[],
};

export type GraphLink = {
  serviceAId: string,
  serviceBId: string,
};

/** The internet and the host devices are what services can reach outside of their links */
export type GraphNode = {
  id: string,
  x: number,
  y: number,
} & (
  | { kind: "service" | "reverse-proxy", name: string } |
  { kind: "internet" } |
  { kind: "device", deviceKind: DeviceKind }
);

export type GraphEdge = {
  id: string,
  sourceId: string,
  targetId: string,
  /** An access edge goes from a service to the internet or a device, it isn't a link */
  kind: "link" | "access",
};

export type ServiceGraph = {
  nodes: GraphNode[],
  edges: GraphEdge[],
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** d3 adds its own fields to the nodes, so the data of a node is kept apart */
type SimulationNode = SimulationNodeDatum & { id: string, data: DistributiveOmit<GraphNode, "x" | "y"> };

function toSimulationNode(data: DistributiveOmit<GraphNode, "x" | "y">): SimulationNode {
  return { id: data.id, data };
}

export const INTERNET_NODE_ID = "internet";

export function getDeviceNodeId(kind: DeviceKind) {
  return `device:${kind}`;
}

/**
 * Lays out the services and nginx with their links.
 * nginx is linked to the services that have a domain, the other system services are left out.
 * The internet and each device kind get a node when a service uses them.
 * The simulation starts from the same positions every time, so the layout only changes with the data.
 */
export function buildServiceGraph(
  services: GraphService[],
  links: GraphLink[],
  reverseProxyId: string | null,
): ServiceGraph {
  const nodes: SimulationNode[] = services
    .filter(service => service.type !== "system" || service.id === reverseProxyId)
    .map(service => toSimulationNode({
      id: service.id,
      name: service.name,
      kind: service.id === reverseProxyId ? "reverse-proxy" : "service",
    }));
  const nodeIds = new Set(nodes.map(node => node.id));

  const pairs = links.map(link => [link.serviceAId, link.serviceBId] as const);
  type SimulationLink = SimulationLinkDatum<SimulationNode> & { id: string, kind: GraphEdge["kind"] };
  const simulationLinks: SimulationLink[] = pairs
    .filter(([a, b]) => a !== b && nodeIds.has(a) && nodeIds.has(b))
    .map(([a, b]) => ({ id: `${a}:${b}`, source: a, target: b, kind: "link" }));

  // The system services can't be given the internet or devices by the user, so they aren't connected to them
  const userServices = services.filter(service => service.type !== "system");
  const internetUsers = userServices.filter(service => service.internetAccess);
  if (internetUsers.length > 0) {
    nodes.push(toSimulationNode({ id: INTERNET_NODE_ID, kind: "internet" }));
    for (const service of internetUsers) {
      const id = `${service.id}:${INTERNET_NODE_ID}`;
      simulationLinks.push({ id, source: service.id, target: INTERNET_NODE_ID, kind: "access" });
    }
  }
  const deviceUsers = Map.groupBy(
    userServices.flatMap(service => service.devices.map(device => ({ kind: device.kind, serviceId: service.id }))),
    use => use.kind,
  );
  for (const [deviceKind, uses] of [...deviceUsers].toSorted(([a], [b]) => a.localeCompare(b))) {
    const nodeId = getDeviceNodeId(deviceKind);
    nodes.push(toSimulationNode({ id: nodeId, kind: "device", deviceKind }));
    for (const { serviceId } of uses) {
      simulationLinks.push({ id: `${serviceId}:${nodeId}`, source: serviceId, target: nodeId, kind: "access" });
    }
  }

  forceSimulation(nodes)
    .force("link", forceLink<SimulationNode, SimulationLink>(simulationLinks).id(node => node.id).distance(140))
    .force("charge", forceManyBody().strength(-600))
    .force("collide", forceCollide(56))
    .force("center", forceCenter(0, 0))
    .stop()
    .tick(300);

  return {
    nodes: nodes.map(node => ({
      ...node.data,
      x: Math.round(node.x ?? 0),
      y: Math.round(node.y ?? 0),
    })),
    edges: simulationLinks.map(link => ({
      id: link.id,
      sourceId: (link.source as SimulationNode).id,
      targetId: (link.target as SimulationNode).id,
      kind: link.kind,
    })),
  };
}
