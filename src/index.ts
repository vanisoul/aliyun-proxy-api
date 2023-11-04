import { Elysia } from "elysia";
import { createInstance } from "@/service/create-instance";
import { startInstance } from "@/service/start-instance";
import { getInstanceIp } from "@/service/get-instance-ip";
import { installDocker } from "@/service/install-docker";
import { sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";

async function create() {
  console.log("create");

  // 建立實例
  const id = await createInstance();
  console.log("start", { id });
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
  const ip = await getInstanceIp(id);
  console.log("install docker", { id, ip });

  // 啟動實例, 並等待狀態為 Running
  const start = await startInstance(id);
  console.log("ip", { id, start });

  // 安裝 docker
  const docker = await installDocker(id);
  console.log("done", { id, docker });
}

const app = new Elysia()
  .get("/create", () => {
    void create();
    return "ok";
  })
  .get("/list", () => sqliteDB.getInstances())
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
