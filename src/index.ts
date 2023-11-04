import { Elysia } from "elysia";
import { Client } from "./aliyun/index";
import aliyrnJson from "./data/aliyun.json";

async function test() {
  const aliyunECS = new Client(
    aliyrnJson.accessKeyId,
    aliyrnJson.accessKeySecret,
    aliyrnJson.endpoint,
    aliyrnJson.regionId,
  );
  const result = await aliyunECS.createInstance();
  return result;
}

const app = new Elysia()
  .get("/", () => test())
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
