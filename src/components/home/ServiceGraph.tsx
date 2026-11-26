"use client";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { type PointerEvent, useMemo, useRef, useState } from "react";
import type { ServiceGraph as ServiceGraphData } from "~/core/service-graph";
import useLocalStorage from "~/hooks/useLocalStorage";
import { Link } from "~/i18n/navigation";

const NODE_RADIUS = 28;
const LABEL_GAP = 20;
const MAX_LABEL_LENGTH = 24;
const PADDING = 96;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 600;
const STORAGE_KEY = "service-graph-positions";

type ViewBox = ReturnType<typeof getViewBox>;

type Point = { x: number, y: number };

type Drag = {
  nodeId: string,
  pointerId: number,
  offset: Point,
};

/** The moved positions by node ID */
type Positions = Record<string, Point>;

const NO_POSITIONS: Positions = {};

export type ServiceGraphProps = {
  graph: ServiceGraphData,
  label: string,
};

function truncate(name: string) {
  return name.length > MAX_LABEL_LENGTH ? `${name.slice(0, MAX_LABEL_LENGTH - 1)}…` : name;
}

/** A small graph isn't zoomed in, it stays in the middle */
function getViewBox(graph: ServiceGraphData) {
  const xs = graph.nodes.map(node => node.x);
  const ys = graph.nodes.map(node => node.y);
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + (PADDING * 2), MIN_WIDTH);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + (PADDING * 2), MIN_HEIGHT);
  const minX = ((Math.min(...xs) + Math.max(...xs)) / 2) - (width / 2);
  const minY = ((Math.min(...ys) + Math.max(...ys)) / 2) - (height / 2);
  return { minX, minY, width, height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isPoint(value: unknown): value is Point {
  return typeof value === "object" && value !== null &&
    typeof (value as Point).x === "number" && typeof (value as Point).y === "number";
}

/** A node can't leave the view, its label must stay visible too */
function clampToView({ x, y }: Point, { minX, minY, width, height }: ViewBox): Point {
  return {
    // A label is wider than its node, the padding of the layout leaves room for it
    x: clamp(x, minX + PADDING, minX + width - PADDING),
    y: clamp(y, minY + NODE_RADIUS, minY + height - NODE_RADIUS - (LABEL_GAP * 2)),
  };
}

/**
 * A node is dragged by its circle and its name opens its service, the lines aren't interactive.
 * The moved positions are saved in the local storage when a drag ends, the other nodes keep the layout of the server.
 * The view can change with the data, so a saved position is kept in it when it's shown.
 */
const ServiceGraph = ({ graph, label }: ServiceGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [saved, setSaved] = useLocalStorage<Positions>(STORAGE_KEY, NO_POSITIONS);
  const [dragged, setDragged] = useState<{ nodeId: string, position: Point } | null>(null);
  // The view doesn't follow the dragged nodes, so it stays still
  const viewBox = useMemo(() => getViewBox(graph), [graph]);
  const nodes = new Map(graph.nodes.map(node => {
    const position = dragged?.nodeId === node.id ? dragged.position : saved[node.id];
    return [node.id, { ...node, ...(isPoint(position) ? clampToView(position, viewBox) : null) }];
  }));

  const toGraphPoint = (event: PointerEvent): Point => {
    const matrix = svgRef.current?.getScreenCTM()?.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  };

  const startDrag = (event: PointerEvent<Element>, nodeId: string) => {
    if (event.button !== 0) return;
    const node = nodes.get(nodeId)!;
    const point = toGraphPoint(event);
    dragRef.current = {
      nodeId,
      pointerId: event.pointerId,
      offset: { x: point.x - node.x, y: point.y - node.y },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<Element>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = toGraphPoint(event);
    const position = clampToView({ x: point.x - drag.offset.x, y: point.y - drag.offset.y }, viewBox);
    setDragged({ nodeId: drag.nodeId, position });
  };

  const endDrag = (event: PointerEvent<Element>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    // The storage is only written once for each drag
    if (dragged) {
      // The positions of deleted services are dropped
      const positions = Object.fromEntries(Object.entries(saved).filter(([nodeId]) => nodes.has(nodeId)));
      setSaved({ ...positions, [dragged.nodeId]: dragged.position });
    }
    setDragged(null);
  };

  return (
    <svg
      ref={svgRef}
      role="group"
      aria-label={label}
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      className="h-[calc(100dvh-8rem)] min-h-96 w-full select-none"
    >
      <g className="stroke-slate-700" strokeWidth={2}>
        {graph.edges.map(edge => {
          const source = nodes.get(edge.sourceId)!;
          const target = nodes.get(edge.targetId)!;
          return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
        })}
      </g>
      {[...nodes.values()].map(node => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            strokeWidth={2}
            onPointerDown={event => startDrag(event, node.id)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              "cursor-grab touch-none transition-colors active:cursor-grabbing",
              node.isReverseProxy
                ? "fill-sky-950 stroke-sky-500 hover:fill-sky-900"
                : "fill-slate-900 stroke-slate-500 hover:fill-slate-800",
            )}
          />
          <Link href={{ pathname: "/services/[id]", params: { id: node.id } }} className="group outline-none">
            <title>{node.name}</title>
            <text
              x={node.x}
              y={node.y + NODE_RADIUS + LABEL_GAP}
              textAnchor="middle"
              className={cn(
                "fill-slate-300 text-sm",
                "group-hover:fill-slate-100 group-hover:underline",
                "group-focus-visible:fill-slate-100 group-focus-visible:underline",
              )}
            >
              {truncate(node.name)}
            </text>
          </Link>
        </g>
      ))}
    </svg>
  );
};

export default ServiceGraph;
