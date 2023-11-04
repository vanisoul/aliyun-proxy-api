import { aliyunECS } from "@/aliyun";
import { sqliteDB } from "@/sqlite";

export async function getInstanceIp(id: string) {
  const ip = await aliyunECS.getInstanceIp(id);
  sqliteDB.setInstanceIp(id, ip ?? "error");
  return ip;
}
