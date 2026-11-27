/** An event of `docker pull`, one is sent for each step of each layer */
export type PullProgressEvent = {
  id?: string,
  status?: string,
  progressDetail?: { current?: number, total?: number },
};

export type ByteProgress = {
  current: number,
  total: number,
};

export type PullProgress = {
  download: ByteProgress,
  extract: ByteProgress,
};

type LayerProgress = {
  /** Docker only knows the size of a layer once its download starts */
  size: number | null,
  downloaded: number,
  extracted: number,
};

/** Adds up the progress of the layers of an image pull, the total grows as more layer sizes are known */
export function createPullProgressTracker() {
  const layers = new Map<string, LayerProgress>();

  return {
    update(event: PullProgressEvent) {
      if (!event.id || !event.status) return;
      const layer = layers.get(event.id) ?? { size: null, downloaded: 0, extracted: 0 };
      const { current, total } = event.progressDetail ?? {};
      if (total && total > 0) layer.size ??= total;

      switch (event.status) {
        case "Pulling fs layer":
        case "Waiting":
          break;
        case "Downloading":
          layer.downloaded = current ?? layer.downloaded;
          break;
        case "Verifying Checksum":
        case "Download complete":
          layer.downloaded = layer.size ?? layer.downloaded;
          break;
        case "Extracting":
          layer.downloaded = layer.size ?? layer.downloaded;
          layer.extracted = current ?? layer.extracted;
          break;
        case "Pull complete":
          layer.downloaded = layer.size ?? layer.downloaded;
          layer.extracted = layer.size ?? layer.extracted;
          break;
        default:
          // Other events are about the whole image, or about layers that are already present
          return;
      }
      layers.set(event.id, layer);
    },
    summary(): PullProgress {
      const progress: PullProgress = {
        download: { current: 0, total: 0 },
        extract: { current: 0, total: 0 },
      };
      for (const layer of layers.values()) {
        if (layer.size === null) continue;
        progress.download.current += Math.min(layer.downloaded, layer.size);
        progress.download.total += layer.size;
        progress.extract.current += Math.min(layer.extracted, layer.size);
        progress.extract.total += layer.size;
      }
      return progress;
    },
  };
}
