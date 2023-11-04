import { aliyunECS } from "@/aliyun";
import { sqliteDB } from "@/sqlite";
import { installDockerStep } from "@/service/install-docker";

export async function createInstance() {
  const { instanceId, instanceName } = await aliyunECS.createInstance();
  if (instanceId !== undefined) {
    sqliteDB.createInstance(
      instanceId,
      instanceName,
      "admin",
      installDockerStep.length,
      3,
      3,
    );
  }
  return instanceId;
}
