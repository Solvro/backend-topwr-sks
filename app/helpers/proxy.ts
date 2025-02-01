import * as crypto from "node:crypto";

import env from "#start/env";

export interface ProxyConfig {
  username: string;
  password: string;
  port: number;
  host: string;
}

export const getProxyConfig = (): ProxyConfig => {
  const config = {
    username: `${env.get("PROXY_LOGIN")}-session-${crypto.randomBytes(16).toString("hex")}`,
    password: env.get("PROXY_PASSWORD", ""),
    port: env.get("PROXY_PORT", 0),
    host: env.get("PROXY_URL", ""),
  };

  return config;
};
