import http from "node:http";
import readline from "node:readline";
import dotenv from "dotenv";
import api from "./api.js";
import { setSecret } from "./github.js";
import { getAllServices, getPredefinedServices, prepareService, saveService } from "./services.js";

const server = http.createServer(api);

dotenv.config({ path: [".env.local", ".env"] });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string) {
  return new Promise<string>(resolve => rl.question(query, resolve));
}

(async () => {
  const port = parseInt(process.env.PORT || await askQuestion("Port: "));
  const secret = process.env.WEBHOOK_SECRET || await askQuestion("Secret: ");

  setSecret(secret);

  console.clear();

  server.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
  });
  // init services
  const savedServices = await getAllServices();
  const predefinedServices = await getPredefinedServices();
  const unsavedServices = predefinedServices
    .filter(s => !Object.keys(savedServices).includes(s.name));
  await Promise.all(unsavedServices.map(s => saveService(s.name, {
    ...s,
    state: "idle",
  })));

  const services = await getAllServices();

  for (const [serviceId, service] of Object.entries(services)) {
    await prepareService(serviceId, service);
  }
})();
