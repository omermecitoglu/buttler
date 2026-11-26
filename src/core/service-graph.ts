import {
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";

export type GraphService = {
  id: string,
  name: string,
  type: "github" | "dockerhub" | "system",
};

export type GraphLink = {
  serviceAId: string,
  serviceBId: string,
};

export type GraphNode = {
  id: string,
  name: string,
  isReverseProxy: boolean,
  x: number,
  y: number,
};

export type GraphEdge = {
  id: string,
  sourceId: string,
  targetId: string,
};

export type ServiceGraph = {
  nodes: GraphNode[],
  edges: GraphEdge[],
};

type SimulationNode = SimulationNodeDatum & Omit<GraphNode, "x" | "y">;

/**
 * Lays out the services and nginx with their links.
 * nginx is connected to the services that have a domain, the other system services are left out.
 * The simulation starts from the same positions every time, so the layout only changes with the data.
 */
export function buildServiceGraph(
  services: GraphService[],
  links: GraphLink[],
  reverseProxyId: string | null,
  servicesWithDomains: string[],
): ServiceGraph {
  const nodes: SimulationNode[] = services
    .filter(service => service.type !== "system" || service.id === reverseProxyId)
    .map(service => ({ id: service.id, name: service.name, isReverseProxy: service.id === reverseProxyId }));
  const nodeIds = new Set(nodes.map(node => node.id));

  const pairs = links.map(link => [link.serviceAId, link.serviceBId] as const);
  if (reverseProxyId && nodeIds.has(reverseProxyId)) {
    pairs.push(...servicesWithDomains.map(serviceId => [reverseProxyId, serviceId] as const));
  }
  type SimulationLink = SimulationLinkDatum<SimulationNode> & { id: string };
  const simulationLinks: SimulationLink[] = pairs
    .filter(([a, b]) => a !== b && nodeIds.has(a) && nodeIds.has(b))
    .map(([a, b]) => ({ id: `${a}:${b}`, source: a, target: b }));

  forceSimulation(nodes)
    .force("link", forceLink<SimulationNode, SimulationLink>(simulationLinks).id(node => node.id).distance(140))
    .force("charge", forceManyBody().strength(-600))
    .force("collide", forceCollide(56))
    .force("center", forceCenter(0, 0))
    .stop()
    .tick(300);

  return {
    nodes: nodes.map(node => ({
      id: node.id,
      name: node.name,
      isReverseProxy: node.isReverseProxy,
      x: Math.round(node.x ?? 0),
      y: Math.round(node.y ?? 0),
    })),
    edges: simulationLinks.map(link => ({
      id: link.id,
      sourceId: (link.source as SimulationNode).id,
      targetId: (link.target as SimulationNode).id,
    })),
  };
}
