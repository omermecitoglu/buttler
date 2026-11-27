import { describe, expect, it } from "vitest";
import { createPullProgressTracker } from "./pull-progress";

describe("createPullProgressTracker", () => {
  it("should be empty before any layer size is known", () => {
    const tracker = createPullProgressTracker();
    tracker.update({ id: "latest", status: "Pulling from library/nginx" });
    tracker.update({ id: "a", status: "Pulling fs layer", progressDetail: {} });
    tracker.update({ id: "b", status: "Waiting", progressDetail: {} });
    expect(tracker.summary()).toEqual({
      download: { current: 0, total: 0 },
      extract: { current: 0, total: 0 },
    });
  });

  it("should add up the downloads of the layers", () => {
    const tracker = createPullProgressTracker();
    tracker.update({ id: "a", status: "Downloading", progressDetail: { current: 30, total: 100 } });
    tracker.update({ id: "b", status: "Downloading", progressDetail: { current: 10, total: 50 } });
    tracker.update({ id: "a", status: "Downloading", progressDetail: { current: 60, total: 100 } });
    expect(tracker.summary()).toEqual({
      download: { current: 70, total: 150 },
      extract: { current: 0, total: 150 },
    });
  });

  it("should count a completed download as the whole layer", () => {
    const tracker = createPullProgressTracker();
    tracker.update({ id: "a", status: "Downloading", progressDetail: { current: 30, total: 100 } });
    tracker.update({ id: "a", status: "Download complete", progressDetail: {} });
    expect(tracker.summary().download).toEqual({ current: 100, total: 100 });
  });

  it("should track the extraction of the layers", () => {
    const tracker = createPullProgressTracker();
    tracker.update({ id: "a", status: "Downloading", progressDetail: { current: 30, total: 100 } });
    tracker.update({ id: "a", status: "Extracting", progressDetail: { current: 40, total: 100 } });
    tracker.update({ id: "b", status: "Download complete", progressDetail: {} });
    tracker.update({ id: "b", status: "Extracting", progressDetail: { current: 10, total: 20 } });
    tracker.update({ id: "b", status: "Pull complete", progressDetail: {} });
    expect(tracker.summary()).toEqual({
      download: { current: 120, total: 120 },
      extract: { current: 60, total: 120 },
    });
  });

  it("should ignore the layers that are already present", () => {
    const tracker = createPullProgressTracker();
    tracker.update({ id: "a", status: "Already exists", progressDetail: {} });
    tracker.update({ id: "b", status: "Downloading", progressDetail: { current: 5, total: 10 } });
    tracker.update({ status: "Digest: sha256:abc" });
    expect(tracker.summary().download).toEqual({ current: 5, total: 10 });
  });
});
