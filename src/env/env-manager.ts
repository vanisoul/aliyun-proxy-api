import { proxyTarget as proxyTargetByJson } from "@/data/proxy.json";
import { xApiKey } from "@/data/api-key.json";
import aliyrnJson from "@/data/aliyun.json";

export function getPrxoyTarget() {
  const proxyTarget =
    Bun.env.PROXY_TARGETS?.split(",").map((target) => target.trim()) ||
    proxyTargetByJson;
  return proxyTarget;
}

export function getXApiKey() {
  const apiKey = Bun.env.X_API_KEY || xApiKey;
  return apiKey;
}

export function getVersion() {
  return process.env.VERSION ?? "0.0.0";
}

export function getConnectTimeout() {
  return Bun.env.CONNECT_TIMEOUT || aliyrnJson.connectTimeout;
}

export const accessKeyId = Bun.env.ACCESS_KEY_ID || aliyrnJson.accessKeyId;
export const accessKeySecret = Bun.env.ACCESS_KEY_SECRET ||
  aliyrnJson.accessKeySecret;
export const endpoint = Bun.env.ENDPOINT || aliyrnJson.endpoint;
export const regionId = Bun.env.REGION_ID || aliyrnJson.regionId;
export const vSwitchId = Bun.env.V_SWITCH_ID || "vsw-2zehmapcr6dqr0t1buk3h";
export const securityGroupId = Bun.env.SECURITY_GROUP_ID ||
  "sg-2ze8wux02843vfnxxmrb";

export const isProd = Bun.env.NODE_ENV === "production";
export const checkHeaders = Bun.env.CHECK_HEADERS ||
  "x-forwarded-for;x-real-ip";

export const enableForceClear =
  Bun.env.ENABLE_FORCE_CLEAR?.toString().toLocaleLowerCase() === "true" ||
  false;
export const forceCronTime = Bun.env.FORCE_CLEAR_TIME || "0 4 * * *";
