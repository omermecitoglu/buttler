import { describe, expect, it } from "vitest";
import { createRedactor } from "./redact";

function run(secrets: string[], chunks: string[]) {
  const output: string[] = [];
  const redactor = createRedactor(secrets, text => output.push(text));
  chunks.forEach(redactor.write);
  redactor.flush();
  return output.join("");
}

describe("createRedactor", () => {
  it("should hide secrets that are split into chunks", () => {
    expect(run(["hunter22"], ["a hun", "ter22 b\nc hunter22"])).toBe("a *** b\nc ***");
  });

  it("should hide the longest secret first", () => {
    expect(run(["abc", "abcdef"], ["abcdef abc\n"])).toBe("*** ***\n");
  });

  it("should hide each line of multi-line secrets", () => {
    expect(run(["{\n  line-one\r\n  line-two\n}"], ["#1 line-one\n#1 line-two\n}\n"])).toBe("#1 ***\n#1 ***\n}\n");
  });

  it("should not delay or change the text without secrets", () => {
    const output: string[] = [];
    const redactor = createRedactor([""], text => output.push(text));
    redactor.write("partial");
    expect(output).toEqual(["partial"]);
  });
});
