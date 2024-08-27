import "server-only";

export function startWorking(recover: boolean) {
  return fetch(new URL("/work", `http://localhost:${process.env.PORT}`), {
    method: "POST",
    body: JSON.stringify({
      secret: process.env.WEBHOOK_SECRET,
      recover,
    }),
  });
}
