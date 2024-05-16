import { Elysia, t } from "elysia";
import { ip } from "elysia-ip";
import * as ipTools from "ip";
import { CronTime } from "cron";

import { swagger } from "@elysiajs/swagger";
import { createInstance } from "@/service/create-instance";
import { startInstance } from "@/service/start-instance";
import { getInstanceIp } from "@/service/get-instance-ip";
import { installDocker } from "@/service/install-docker";
import { installSocks } from "@/service/install-sock5";
import { installVpn } from "@/service/install-vpn";
import { clearInstance } from "@/service/clear-instance";
import { isReady } from "@/service/instance-ready";
import { generatePACFile } from "@/service/pac-file";

import { sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";
import { clearInstanceJob, forceClearJob } from "@/cron-tab/index";

import {
  checkHeaders,
  enableForceClear,
  forceCronTime,
  getPrxoyTarget,
  getVersion,
  getXApiKey,
  isProd,
} from "@/env/env-manager";

const queryStringSchema = t.Object({
  xApiKey: t.String(),
});

// 建立中變數, 用於避免重複執行
let creating = false;

function addressToIpv4(address: string) {
  // 正則表達式匹配 IPv4 映射的 IPv6 地址
  const regex = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
  const match = address.match(regex);

  // 如果匹配成功，則返回匹配的 IPv4 地址
  if (match) {
    return match[1];
  }

  // 如果輸入的不是有效的 IPv4 映射的 IPv6 地址，返回 null 或自定義錯誤
  return address; // 或 throw new Error("不是有效的 IPv4 映射的 IPv6 地址");
}

async function create() {
  console.log("create");
  // 建立實例
  const id = await createInstance();
  if (id === undefined) {
    return;
  }

  // 等待狀態為 Stopped
  let stoped = false;
  while (!stoped) {
    stoped = await aliyunECS.describeStoppedInstance(id);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // 獲取 IP
  console.log("ip", { id });
  const ip = await getInstanceIp(id);
  if (ip === undefined) {
    return;
  }

  // 啟動實例, 並等待狀態為 Running
  console.log("start", { id, ip });
  const start = await startInstance(id);

  // 安裝 docker
  console.log("install docker", { id, start });
  const docker = await installDocker(id);

  // 安裝 sock5
  console.log("install socks", { id, docker });
  const socks = await installSocks(id, ip);

  // 安裝 vpn
  console.log("install vpn", { id, socks });
  await installVpn(id);

  console.log("done", { id });
}

const app = new Elysia()
  .onBeforeHandle(({ query, path }) => {
    // 排除檢查列表
    const excludeList = ["/swagger/json"];
    if (excludeList.includes(path)) {
      return;
    }

    const apiKey = getXApiKey();
    if (apiKey && apiKey !== query.xApiKey) {
      return { status: 401, body: "Unauthorized" };
    }
  })
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: { version: getVersion(), title: "aliyun-proxy-api" },
      },
    }),
  )
  // 建立實例
  .get("/create", async () => {
    // 如果有正在建立中的實例, 則不執行
    if (creating) {
      console.log("creating");
      return "creating";
    }
    creating = true;

    // 等待 15 秒, 解放避免連點手誤
    setTimeout(() => {
      creating = false;
    }, 15000);

    // 建立實例
    void create();
    void clearInstance();

    // 回傳已收到建立指令, 並在背景執行, 如果需要知道狀態, 請使用 /ids & /status/:id
    return "start create, please check /ids & /status/:id";
  }, {
    query: queryStringSchema,
  })
  // 取得所有 id
  .get("/ids", async () => {
    const result = await aliyunECS.describeInstances();
    const ids = result.instances?.instance?.map((instance) =>
      instance.instanceId
    );
    return ids;
  }, {
    query: queryStringSchema,
  })
  // 根據 id 刪除實例
  .get("/delete/:id", async ({ params: { id } }) => {
    sqliteDB.deleteInstance(id);
    const result = await clearInstance();
    return result;
  }, {
    query: queryStringSchema,
  })
  .get("/delete/", async () => {
    const instances = sqliteDB.getInstances();
    const ids = instances.map((instance) => instance.id);
    sqliteDB.deleteInstances(ids);
    const result = await clearInstance();
    return result;
  }, {
    query: queryStringSchema,
  })
  .get("/clear", async () => {
    const result = await clearInstance();
    if (result === undefined) {
      return "no instance need delete";
    } else {
      return "instance deleted: " + result.join(", ");
    }
  }, {
    query: queryStringSchema,
  })
  // 根據 id 得到實例狀態
  .get("/status/:id", async ({ params: { id } }) => {
    const result = sqliteDB.getInstanceById(id);
    if (result === null) {
      return { msg: "id not found" };
    }
    return result;
  }, {
    query: queryStringSchema,
  })
  // 取得所有實例狀態
  .get("/list", () => sqliteDB.getInstances(), {
    query: queryStringSchema,
  })
  // 產生 proxy.pac
  .get("/pacfile/:id", async ({ params: { id } }) => {
    const instance = sqliteDB.getInstanceById(id);
    if (instance === null || !isReady(instance)) {
      return "id not found or instance not ready";
    }
    const pacFile = generatePACFile(getPrxoyTarget(), instance.ip);
    return pacFile;
  }, {
    query: queryStringSchema,
  })
  .get("/pacfile", async () => {
    const instances = sqliteDB.getInstances().filter((instance) =>
      isReady(instance)
    );
    if (instances.length === 0) {
      return "no instance";
    }

    const instance = instances[Math.floor(Math.random() * instances.length)];
    const pacFile = generatePACFile(getPrxoyTarget(), instance.ip);
    return pacFile;
  }, {
    query: queryStringSchema,
  })
  // 設定 安全組 authorizeSecurityGroup
  .use(ip({
    checkHeaders: checkHeaders.split(";"),
  })).get("/setSecurity", async ({ ip, request }) => {
    console.log("ip", ip);
    console.log("headers", JSON.stringify(request.headers, null, 2));

    const ipAddr = (ip as any).address;
    const ipv4Ip = addressToIpv4(ipAddr);

    if (!ipTools.isV4Format(ipv4Ip)) {
      return "not a valid ipv4";
    }

    await aliyunECS.revokeSecurityGroup();

    const result = await aliyunECS.authorizeSecurityGroup(
      true,
      true,
      true,
      ipv4Ip ?? "127.0.0.1",
    );
    return result;
  }, {
    query: queryStringSchema,
  })
  // 設定 安全組 authorizeSecurityGroup 但是 IP 直接指定 由下一個 Path
  .get("/setSecurity/:ip", async ({ query, params: { ip } }) => {
    await aliyunECS.revokeSecurityGroup();
    const result = await aliyunECS.authorizeSecurityGroup(true, true, true, ip);
    return result;
  }, {
    query: queryStringSchema,
  })
  .listen(3000);

clearInstanceJob.start();
if (enableForceClear) {
  forceClearJob.cronTime = new CronTime(forceCronTime);
  forceClearJob.start();
}

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
