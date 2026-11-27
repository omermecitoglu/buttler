import { useEffect, useState } from "react";
import type { PullProgress } from "~/core/docker/pull-progress";

export default function usePullProgress(serviceId: string) {
  const [progress, setProgress] = useState<PullProgress | null>(null);

  useEffect(() => {
    const source = new EventSource(`/api/services/${encodeURIComponent(serviceId)}/pull/stream`);

    source.onmessage = (event: MessageEvent<string>) => {
      setProgress(JSON.parse(event.data) as PullProgress | null);
    };

    // The status of the service is refreshed by the poller, which removes the progress
    source.addEventListener("end", () => source.close());

    return () => source.close();
  }, [serviceId]);

  return progress;
}
