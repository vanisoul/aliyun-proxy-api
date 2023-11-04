// 清除管理之外的實例

import { sqliteDB } from "@/sqlite/index";
import { aliyunECS } from "@/aliyun/index";

export async function clearInstance() {
  // 取得所有 aliyunECS 存在實體
  const instances = await aliyunECS.describeInstances();

  const instanceIdsByAliyun = instances.instances?.instance?.map((x) =>
    x.instanceId
  ).filter((x) => x !== undefined) as string[];
  if (instanceIdsByAliyun === undefined) {
    return;
  }
  // 取得所有 sqliteDB 存在實體
  const instanceIdsBySqlite = sqliteDB.getInstances().map((instance) =>
    instance.id
  );

  // 取得所有在 aliyunECS 但是不在 sqliteDB 的實體
  const instanceIdsByAliyunOnly = instanceIdsByAliyun.filter(
    (id) => !instanceIdsBySqlite.includes(id),
  );

  // 刪除 instanceIdsByAliyunOnly 這些實體
  await aliyunECS.deleteInstance(instanceIdsByAliyunOnly);
}
