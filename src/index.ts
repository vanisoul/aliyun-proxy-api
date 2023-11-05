import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { createInstance } from "@/service/create-instance";
import { startInstance } from "@/service/start-instance";
import { getInstanceIp } from "@/service/get-instance-ip";
import { installDocker } from "@/service/install-docker";
import { installSocks } from "@/service/install-sock5";
import { clearInstance } from "@/service/clear-instance";
import { isReady } from "@/service/instance-ready";
import { generatePACFile } from "@/service/pac-file";

import { sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";
import { clearInstanceJob, forceClearJob } from "@/cron-tab/index";

import { proxyTarget } from "@/data/proxy.json";

// 建立中變數, 用於避免重複執行
let creating = false;

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

  console.log("done", { id, socks });
}

const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: { version: process.env.VERSION ?? "0.0.0", title: "china-vpn" },
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
  })
  // 取得所有 id
  .get("/ids", async () => {
    const result = await aliyunECS.describeInstances();
    const ids = result.instances?.instance?.map((instance) =>
      instance.instanceId
    );
    return ids;
  })
  // 根據 id 刪除實例
  .get("/delete/:id", async ({ params: { id } }) => {
    sqliteDB.deleteInstance(id);
    const result = await clearInstance();
    return result;
  })
  .get("/delete/", async () => {
    const instances = sqliteDB.getInstances();
    const ids = instances.map((instance) => instance.id);
    sqliteDB.deleteInstances(ids);
    const result = await clearInstance();
    return result;
  })
  .get("/clear", async () => {
    const result = await clearInstance();
    if (result === undefined) {
      return "no instance need delete";
    } else {
      return "instance deleted: " + result.join(", ");
    }
  })
  // 根據 id 得到實例狀態
  .get("/status/:id", async ({ params: { id } }) => {
    const result = sqliteDB.getInstanceById(id);
    if (result === null) {
      return { msg: "id not found" };
    }
    return result;
  })
  // 取得所有實例狀態
  .get("/list", () => sqliteDB.getInstances())
  // 產生 proxy.pac
  .get("/pacfile/:id", async ({ params: { id } }) => {
    const instance = sqliteDB.getInstanceById(id);
    if (instance === null || !isReady(instance)) {
      return "id not found or instance not ready";
    }
    const pacFile = generatePACFile(proxyTarget, instance.ip);
    return pacFile;
  })
  .get("/pacfile", async () => {
    const instances = sqliteDB.getInstances().filter((instance) =>
      isReady(instance)
    );
    if (instances.length === 0) {
      return "no instance";
    }

    const instance = instances[Math.floor(Math.random() * instances.length)];
    const pacFile = generatePACFile(proxyTarget, instance.ip);
    return pacFile;
  })
  .listen(3000);

clearInstanceJob.start();
forceClearJob.start();

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
