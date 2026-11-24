import { useEffect, useRef, useState } from "react";
import type { LogLine } from "~/core/docker/logs";

export type NumberedLogLine = LogLine & {
  number: number,
};

export type LogStreamStatus = "connecting" | "live" | "reconnecting" | "stopped" | "failed";

/** Older lines are dropped from the browser, not from Docker */
const MAX_LINES = 2000;
const RECONNECT_DELAY = 2000;

export default function useContainerLogs(serviceId: string, isRunning: boolean) {
  const [lines, setLines] = useState<NumberedLogLine[]>([]);
  const [status, setStatus] = useState<LogStreamStatus>("connecting");
  const [version, setVersion] = useState(0);
  const lastTimestamp = useRef<string | null>(null);
  const lastNumber = useRef(0);

  // The stream is closed when the page is hidden, and continues from the last line afterwards
  useEffect(() => {
    const query = lastTimestamp.current ? `?since=${encodeURIComponent(lastTimestamp.current)}` : "";
    const source = new EventSource(`/api/services/${encodeURIComponent(serviceId)}/logs/stream${query}`);
    let timeout: ReturnType<typeof setTimeout> | undefined;

    source.onopen = () => setStatus("live");

    source.onmessage = (event: MessageEvent<string>) => {
      const batch = (JSON.parse(event.data) as LogLine[]).map(line => ({ ...line, number: ++lastNumber.current }));
      lastTimestamp.current = batch.at(-1)?.timestamp ?? lastTimestamp.current;
      setLines(current => [...current, ...batch].slice(-MAX_LINES));
    };

    source.addEventListener("end", (event: MessageEvent<string>) => {
      source.close();
      const { running } = JSON.parse(event.data) as { running: boolean };
      if (!running) {
        setStatus("stopped");
        return;
      }
      // The container has been restarted
      setStatus("reconnecting");
      timeout = setTimeout(() => setVersion(current => current + 1), RECONNECT_DELAY);
    });

    source.addEventListener("failure", () => {
      source.close();
      setStatus("failed");
    });

    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? "failed" : "reconnecting");
    };

    return () => {
      source.close();
      clearTimeout(timeout);
    };
  }, [serviceId, isRunning, version]);

  return {
    lines,
    status,
    clear: () => setLines([]),
    reconnect: () => {
      setStatus("connecting");
      setVersion(current => current + 1);
    },
  };
}
