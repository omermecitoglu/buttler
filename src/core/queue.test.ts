import { describe, expect, it } from "vitest";
import { createQueue } from "./queue";

describe("createQueue", () => {
  it("should run the tasks one after another", async () => {
    const enqueue = createQueue("test-order");
    const events: string[] = [];
    const run = (name: string) => enqueue(async () => {
      events.push(`${name} started`);
      await new Promise(resolve => {
        setTimeout(resolve, 1);
      });
      events.push(`${name} ended`);
      return name;
    });
    expect(await Promise.all([run("a"), run("b")])).toEqual(["a", "b"]);
    expect(events).toEqual(["a started", "a ended", "b started", "b ended"]);
  });

  it("should go on after a task that fails", async () => {
    const enqueue = createQueue("test-failure");
    const failure = enqueue(() => Promise.reject(new Error("failed")));
    const success = enqueue(() => Promise.resolve("done"));
    await expect(failure).rejects.toThrow("failed");
    expect(await success).toBe("done");
  });
});
