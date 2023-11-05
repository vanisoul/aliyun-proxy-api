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
    return [];
  }
  // 取得所有 sqliteDB 存在實體
  const instanceIdsBySqlite = sqliteDB.getInstances().map((instance) =>
    instance.id
  );

  // 取得所有在 aliyunECS 但是不在 sqliteDB 的實體
  const instanceIdsByAliyunOnly = instanceIdsByAliyun.filter(
    (id) => !instanceIdsBySqlite.includes(id),
  );

  // 取得所有在 sqliteDB 但是不在 aliyunECS 的實體
  const instanceIdsBySqliteOnly = instanceIdsBySqlite.filter(
    (id) => !instanceIdsByAliyun.includes(id),
  );

  // 刪除只存在 instanceIdsBySqliteOnly 的紀錄
  sqliteDB.deleteInstances(instanceIdsBySqliteOnly);

  // 刪除實際實體, 如果為空則不刪除
  if (instanceIdsByAliyunOnly.length === 0) {
    console.log("========= no instance to delete =========");
    return undefined;
  }

  // 刪除 instanceIdsByAliyunOnly 這些實體
  await aliyunECS.deleteInstance(instanceIdsByAliyunOnly);
  return instanceIdsByAliyunOnly;
}
