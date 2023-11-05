import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { createInstance } from "@/service/create-instance";
import { startInstance } from "@/service/start-instance";
import { getInstanceIp } from "@/service/get-instance-ip";
import { installDocker } from "@/service/install-docker";
import { installSocks } from "@/service/install-sock5";
import { clearInstance } from "@/service/clear-instance";
import { generatePACFile } from "@/service/pac-file";

import { Instance, sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";
import { clearInstanceJob } from "@/cron-tab/index";

import { proxyTarget } from "@/data/proxy.json";

async function create() {
  // 先延遲避免重複執行, 等待 5 秒
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 如果有正在執行的實例, 則不執行
  const running = sqliteDB.getRunningInstance();
  if (running) {
    console.log("running", { running });
    return;
  }

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
  .use(swagger({ path: "/swagger" }))
  // 建立實例
  .get("/create", async () => {
    // 建立實例
    void create();

    // 回傳已收到建立指令, 並告知管理介面沒增加主機, 可能是因為正在建立中, 確認是否有正在建立中的實例
    return "create, but not add to list, please check running instance";
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
    const result = await aliyunECS.deleteInstance([id]);
    return result;
  })
  .get("/delete/", async () => {
    const instances = sqliteDB.getInstances();
    const ids = instances.map((instance) => instance.id);
    const result = await aliyunECS.deleteInstance(ids);
    await clearInstance();
    return result;
  })
  // await clearInstance();
  .get("/clear", async () => {
    const result = await clearInstance();
    if (result === undefined) {
      return "no instance to delete";
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

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

function isReady(instance: Instance) {
  return instance.start ||
    instance.docker ||
    instance.socks ||
    instance.ipsecVpn;
}
