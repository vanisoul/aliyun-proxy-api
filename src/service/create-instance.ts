import { aliyunECS } from "@/aliyun";
import { sqliteDB } from "@/sqlite";
import { installDockerStep } from "@/service/install-docker";
import { installSocksStep } from "@/service/install-sock5";

export async function createInstance() {
  const { instanceId, instanceName } = await aliyunECS.createInstance();
  if (instanceId !== undefined) {
    sqliteDB.createInstance(
      instanceId,
      instanceName,
      "admin",
      installDockerStep.length,
      installSocksStep.length,
      0,
    );
  }
  return instanceId;
}
