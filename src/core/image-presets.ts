/** The images that Buttler knows the variables of */
export const presetImages = ["postgres", "mysql", "mariadb", "redis", "mongo", "devlikeapro/waha"] as const;

export type PresetImage = typeof presetImages[number];

export type PresetVariable = {
  key: string,
  /** `null` is a generated password */
  value: string | null,
};

export type ImagePreset = {
  image: PresetImage,
  /** The variables the image reads, which the shared variables refer to */
  variables: PresetVariable[],
  sharedVariables: { key: string, template: string }[],
  /** The volumes the image keeps its data in */
  volumes?: { name: string, containerPath: string }[],
};

const presets: Record<PresetImage, Omit<ImagePreset, "image">> = {
  "postgres": {
    variables: [
      { key: "POSTGRES_USER", value: "postgres" },
      { key: "POSTGRES_PASSWORD", value: null },
      { key: "POSTGRES_DB", value: "postgres" },
    ],
    sharedVariables: [
      {
        key: "DATABASE_URL",
        template: "postgresql://{env.POSTGRES_USER}:{env.POSTGRES_PASSWORD}@{host}:5432/{env.POSTGRES_DB}",
      },
      { key: "POSTGRES_HOST", template: "{host}" },
      { key: "POSTGRES_PORT", template: "5432" },
      { key: "POSTGRES_USER", template: "{env.POSTGRES_USER}" },
      { key: "POSTGRES_PASSWORD", template: "{env.POSTGRES_PASSWORD}" },
      { key: "POSTGRES_DB", template: "{env.POSTGRES_DB}" },
    ],
  },
  "mysql": {
    variables: [
      { key: "MYSQL_ROOT_PASSWORD", value: null },
      { key: "MYSQL_USER", value: "app" },
      { key: "MYSQL_PASSWORD", value: null },
      { key: "MYSQL_DATABASE", value: "app" },
    ],
    sharedVariables: [
      {
        key: "DATABASE_URL",
        template: "mysql://{env.MYSQL_USER}:{env.MYSQL_PASSWORD}@{host}:3306/{env.MYSQL_DATABASE}",
      },
      { key: "MYSQL_HOST", template: "{host}" },
      { key: "MYSQL_PORT", template: "3306" },
      { key: "MYSQL_USER", template: "{env.MYSQL_USER}" },
      { key: "MYSQL_PASSWORD", template: "{env.MYSQL_PASSWORD}" },
      { key: "MYSQL_DATABASE", template: "{env.MYSQL_DATABASE}" },
    ],
  },
  "mariadb": {
    variables: [
      { key: "MARIADB_ROOT_PASSWORD", value: null },
      { key: "MARIADB_USER", value: "app" },
      { key: "MARIADB_PASSWORD", value: null },
      { key: "MARIADB_DATABASE", value: "app" },
    ],
    sharedVariables: [
      {
        key: "DATABASE_URL",
        template: "mysql://{env.MARIADB_USER}:{env.MARIADB_PASSWORD}@{host}:3306/{env.MARIADB_DATABASE}",
      },
      { key: "MARIADB_HOST", template: "{host}" },
      { key: "MARIADB_PORT", template: "3306" },
      { key: "MARIADB_USER", template: "{env.MARIADB_USER}" },
      { key: "MARIADB_PASSWORD", template: "{env.MARIADB_PASSWORD}" },
      { key: "MARIADB_DATABASE", template: "{env.MARIADB_DATABASE}" },
    ],
  },
  // The image has no variable for a password, it needs a command
  "redis": {
    variables: [],
    sharedVariables: [
      { key: "REDIS_URL", template: "redis://{host}:6379" },
      { key: "REDIS_HOST", template: "{host}" },
      { key: "REDIS_PORT", template: "6379" },
    ],
  },
  "mongo": {
    variables: [
      { key: "MONGO_INITDB_ROOT_USERNAME", value: "root" },
      { key: "MONGO_INITDB_ROOT_PASSWORD", value: null },
    ],
    sharedVariables: [
      {
        key: "MONGODB_URI",
        template: "mongodb://{env.MONGO_INITDB_ROOT_USERNAME}:{env.MONGO_INITDB_ROOT_PASSWORD}@{host}:27017",
      },
      { key: "MONGO_HOST", template: "{host}" },
      { key: "MONGO_PORT", template: "27017" },
      { key: "MONGO_USERNAME", template: "{env.MONGO_INITDB_ROOT_USERNAME}" },
      { key: "MONGO_PASSWORD", template: "{env.MONGO_INITDB_ROOT_PASSWORD}" },
    ],
  },
  // WhatsApp HTTP API
  "devlikeapro/waha": {
    variables: [
      { key: "WHATSAPP_API_PORT", value: "3000" },
      { key: "WAHA_API_KEY", value: null },
      // Needs no browser, unlike WEBJS
      { key: "WHATSAPP_DEFAULT_ENGINE", value: "GOWS" },
      { key: "WAHA_DASHBOARD_ENABLED", value: "false" },
      { key: "WAHA_DASHBOARD_USERNAME", value: "admin" },
      { key: "WAHA_DASHBOARD_PASSWORD", value: null },
    ],
    sharedVariables: [
      { key: "WAHA_BASE_URL", template: "http://{host}:{env.WHATSAPP_API_PORT}" },
      { key: "WAHA_API_KEY", template: "{env.WAHA_API_KEY}" },
    ],
    // The WhatsApp logins, without it the QR code is scanned again after every recreation
    volumes: [
      { name: "waha-sessions", containerPath: "/app/.sessions" },
    ],
  },
};

/** Images on Docker Hub, the official ones are in the `library` namespace, which can be left out */
const dockerHubImagePattern = new RegExp([
  (/^(?:(?:docker\.io|index\.docker\.io|registry-1\.docker\.io)\/)?/).source,
  (/(?:library\/)?([^:@]+)/).source,
  // The tag and the digest
  (/(?::[^/@]*)?(?:@.*)?$/).source,
].join(""));

/** The preset of an image, the tag is ignored */
export function getImagePreset(image: string): ImagePreset | null {
  const match = dockerHubImagePattern.exec(image.trim().toLowerCase());
  const name = match?.[1];
  if (!name || !(presetImages as readonly string[]).includes(name)) return null;
  const preset = presets[name as PresetImage];
  return { image: name as PresetImage, ...preset };
}

const passwordAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Letters and digits only, so it can be put into a connection URL as it is */
export function generatePassword(length = 32) {
  // 248 is the largest multiple of 62 below 256, higher bytes would favour some characters
  const limit = 256 - (256 % passwordAlphabet.length);
  let password = "";
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && password.length < length) password += passwordAlphabet[byte % passwordAlphabet.length];
    }
  }
  return password;
}
