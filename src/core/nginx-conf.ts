import { getHostIp } from "./docker";

function generateHttpToHttpsRedirection(serverNames: string[]) {
  const configuration = [
    "listen 80;",
    "listen [::]:80;",
    `server_name ${serverNames.join(" ")};`,
    "return 302 https://$server_name$request_uri;",
  ];
  return `server {\n${configuration.map(c => `\t\t${c}\n`).join("")}\t}`;
}

function generateHttpsServer(serverNames: string[], ip: string, port: string | number) {
  const configuration = [
    "listen 443 ssl;",
    "listen [::]:443 ssl;",
    "http2 on;",
    `server_name ${serverNames.join(" ")};`,
    "ssl_certificate         /etc/ssl/cert.pem;",
    "ssl_certificate_key     /etc/ssl/key.pem;",
    "ssl_client_certificate  /etc/ssl/cloudflare.crt;",
    "ssl_verify_client off;",
  ];
  const proxyConfig = [
    `proxy_pass http://${ip}:${port};`,
    "proxy_set_header Host $host;",
    "proxy_set_header X-Real-IP $remote_addr;",
    "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "proxy_set_header X-Forwarded-Proto $scheme;",
  ];
  const homeDir = `\t\tlocation / {\n${proxyConfig.map(c => `\t\t\t${c}\n`).join("")}\t\t}`;
  const httpsServer = `\tserver {\n${configuration.map(c => `\t\t${c}\n`).join("")}\n${homeDir}\n\t}`;
  return `${generateHttpToHttpsRedirection(serverNames)}\n${httpsServer}`;
}

export async function generateNginxConfig(appHostName?: string) {
  const servers = [];
  if (appHostName) {
    servers.push(generateHttpsServer([appHostName], await getHostIp(), 3000));
  }
  return `events {}\n\nhttp {\n${servers.map(s => `\t${s}\n`).join("")}}`;
}
