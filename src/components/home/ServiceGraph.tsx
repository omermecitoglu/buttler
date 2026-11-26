"use client";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { type PointerEvent, useMemo, useRef, useState } from "react";
import type { ServiceGraph as ServiceGraphData } from "~/core/service-graph";
import { Link } from "~/i18n/navigation";

const NODE_RADIUS = 28;
const LABEL_GAP = 20;
const MAX_LABEL_LENGTH = 24;
const PADDING = 96;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 600;
/** A pointer that moves less than this (in screen pixels) clicks instead of dragging */
const DRAG_THRESHOLD = 4;

type Point = { x: number, y: number };

type Drag = {
  nodeId: string,
  pointerId: number,
  start: Point,
  offset: Point,
  moved: boolean,
};

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

/**
 * Each node opens its service and can be dragged, the lines aren't interactive.
 * The moved positions aren't saved, the layout of the server is used again after a reload.
 */
const ServiceGraph = ({ graph, label }: ServiceGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [moved, setMoved] = useState<Record<string, Point>>({});
  // The view doesn't follow the dragged nodes, so it stays still
  const viewBox = useMemo(() => getViewBox(graph), [graph]);
  const nodes = new Map(graph.nodes.map(node => [node.id, { ...node, ...moved[node.id] }]));

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
      start: { x: event.clientX, y: event.clientY },
      offset: { x: point.x - node.x, y: point.y - node.y },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<Element>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const point = toGraphPoint(event);
    // A node can't leave the view, its label must stay visible too
    const { minX, minY, width, height } = viewBox;
    const position = {
      // A label is wider than its node, the padding of the layout leaves room for it
      x: clamp(point.x - drag.offset.x, minX + PADDING, minX + width - PADDING),
      y: clamp(point.y - drag.offset.y, minY + NODE_RADIUS, minY + height - NODE_RADIUS - (LABEL_GAP * 2)),
    };
    setMoved(current => ({ ...current, [drag.nodeId]: position }));
  };

  const endDrag = (event: PointerEvent<Element>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    // The click that follows a drag is cancelled, see below
    if (!dragRef.current.moved) dragRef.current = null;
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
        <Link
          key={node.id}
          href={{ pathname: "/services/[id]", params: { id: node.id } }}
          draggable={false}
          onDragStart={event => event.preventDefault()}
          onPointerDown={event => startDrag(event, node.id)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={event => {
            if (dragRef.current?.moved) event.preventDefault();
            dragRef.current = null;
          }}
          className="group touch-none outline-none"
        >
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
