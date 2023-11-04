import { aliyunECS } from "@/aliyun/index";
import { sqliteDB } from "@/sqlite";

// start instance
export async function startInstance(id: string) {
  const result = await aliyunECS.startInstance(id);

  // 執行 `const running = await aliyunECS.describeRunningInstance(id);`
  let running = false;
  while (!running) {
    running = await aliyunECS.describeRunningInstance(id);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  sqliteDB.startInstance(id);

  return result;
}
