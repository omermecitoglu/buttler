/* eslint-disable no-console */

export function message(messageType: "info" | "success" | "error" | "warning", content: string) {
  switch (messageType) {
    case "info":
      return console.log("\x1b[34m%s\x1b[0m", content);
    case "success":
      return console.log("\x1b[32m%s\x1b[0m", content);
    case "error":
      return console.log("\x1b[31m%s\x1b[0m", content);
    case "warning":
      return console.log("\x1b[33m%s\x1b[0m", content);
  }
}
