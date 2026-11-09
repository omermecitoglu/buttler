export function generateBaselineProxyConfig() {
  return `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location /healthz {
        access_log off;
        default_type text/plain;
        return 200 "healthy\\n";
    }

    location / {
        default_type text/plain;
        return 200 "Buttler Reverse Proxy is running\\n";
    }
}
`;
}

export const generateBaselineNginxConfig = generateBaselineProxyConfig;

export function generateNginxConfig(_appHostName?: string) {
  return "events {}\n\nhttp {}\n";
}
