const stripWrappingQuotes = (value: string) => {
  if (value.length < 2) {
    return value;
  }

  const startsWithSingleQuote = value.startsWith("'") && value.endsWith("'");
  const startsWithDoubleQuote = value.startsWith('"') && value.endsWith('"');

  if (startsWithSingleQuote || startsWithDoubleQuote) {
    return value.slice(1, -1).trim();
  }

  return value;
};

const normalizeEnvValue = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  return stripWrappingQuotes(trimmedValue);
};

const readRawViteEnv = (key: string) => import.meta.env[key as keyof ImportMetaEnv];

export const getViteEnv = (key: string) => normalizeEnvValue(readRawViteEnv(key));

export const getViteEnvLength = (key: string) => {
  const rawValue = readRawViteEnv(key);
  return typeof rawValue === "string" ? rawValue.length : 0;
};

export const GOOGLE_CLIENT_ID = getViteEnv("VITE_GOOGLE_CLIENT_ID");

let hasLoggedGoogleClientStatus = false;

export const logGoogleClientIdStatusOnce = () => {
  if (!import.meta.env.DEV || hasLoggedGoogleClientStatus) {
    return;
  }

  hasLoggedGoogleClientStatus = true;
  console.info(`VITE_GOOGLE_CLIENT_ID loaded: ${Boolean(GOOGLE_CLIENT_ID)}`);
};
