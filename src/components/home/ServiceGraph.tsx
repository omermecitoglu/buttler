import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ServiceGraph as ServiceGraphData } from "~/core/service-graph";
import { Link } from "~/i18n/navigation";

const NODE_RADIUS = 28;
const LABEL_GAP = 20;
const MAX_LABEL_LENGTH = 24;
const PADDING = 96;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 600;

export type ServiceGraphProps = {
  graph: ServiceGraphData,
  label: string,
};

function truncate(name: string) {
  return name.length > MAX_LABEL_LENGTH ? `${name.slice(0, MAX_LABEL_LENGTH - 1)}…` : name;
}

/** A read-only graph, each node opens its service and the lines aren't interactive */
const ServiceGraph = ({ graph, label }: ServiceGraphProps) => {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const xs = graph.nodes.map(node => node.x);
  const ys = graph.nodes.map(node => node.y);
  // A small graph isn't zoomed in, it stays in the middle
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + (PADDING * 2), MIN_WIDTH);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + (PADDING * 2), MIN_HEIGHT);
  const minX = ((Math.min(...xs) + Math.max(...xs)) / 2) - (width / 2);
  const minY = ((Math.min(...ys) + Math.max(...ys)) / 2) - (height / 2);

  return (
    <svg
      role="group"
      aria-label={label}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      className="h-[calc(100dvh-8rem)] min-h-96 w-full"
    >
      <g className="stroke-slate-700" strokeWidth={2}>
        {graph.edges.map(edge => {
          const source = nodes.get(edge.sourceId)!;
          const target = nodes.get(edge.targetId)!;
          return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
        })}
      </g>
      {graph.nodes.map(node => (
        <Link key={node.id} href={{ pathname: "/services/[id]", params: { id: node.id } }} className="group outline-none">
          <title>{node.name}</title>
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            strokeWidth={2}
            className={cn(
              "transition-colors",
              node.isReverseProxy
                ? "fill-sky-950 stroke-sky-500 group-hover:fill-sky-900 group-focus-visible:stroke-sky-300"
                : "fill-slate-900 stroke-slate-500 group-hover:fill-slate-800 group-focus-visible:stroke-slate-200",
            )}
          />
          <text
            x={node.x}
            y={node.y + NODE_RADIUS + LABEL_GAP}
            textAnchor="middle"
            className="fill-slate-300 text-sm group-hover:fill-slate-100"
          >
            {truncate(node.name)}
          </text>
        </Link>
      ))}
    </svg>
  );
};

export default ServiceGraph;
