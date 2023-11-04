import { aliyunECS } from "@/aliyun/index";
import { sqliteDB } from "@/sqlite";

export const installDockerStep = [
  "sudo apt-get update",
  "sudo apt-get -y install ca-certificates curl gnupg",
  "sudo install -m 0755 -d /etc/apt/keyrings",
  "sudo rm -rf /etc/apt/keyrings/docker.gpg",
  "curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --batch --dearmor -o /etc/apt/keyrings/docker.gpg",
  "sudo chmod a+r /etc/apt/keyrings/docker.gpg",
  `echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`,
  "sudo apt-get update",
  "sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
];

const dockerCheck = "docker --version";

// 指定 ECS ID 執行 docker 安裝
export async function installDocker(id: string) {
  for (
    const { step, idx } of installDockerStep.map((step, idx) => ({ step, idx }))
  ) {
    const { success, msg } = await aliyunECS.runCommand(id, step);
    if (!success) {
      return msg;
    }
    sqliteDB.updateInstanceDockerStep(id, idx + 1);
  }
  const { success, msg } = await aliyunECS.runCommand(id, dockerCheck);
  if (success) {
    return msg;
  } else {
    return "Docker install failed";
  }
}
