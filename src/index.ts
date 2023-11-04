import { Elysia } from "elysia";
import { createInstance } from "@/service/create-instance";
import { startInstance } from "@/service/start-instance";
import { getInstanceIp } from "@/service/get-instance-ip";
import { installDocker } from "@/service/install-docker";
import { installSocks } from "@/service/install-sock5";
import { sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";

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
  .get("/create", async () => {
    // 建立實例
    void create();

    // 回傳已收到建立指令, 並告知管理介面沒增加主機, 可能是因為正在建立中, 確認是否有正在建立中的實例
    return "create, but not add to list, please check running instance";
  })
  .get("/list", () => sqliteDB.getInstances())
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
