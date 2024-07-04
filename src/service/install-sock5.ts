import { aliyunECS } from "@/aliyun/index";
import { sqliteDB } from "@/sqlite";

export const installSocksStep = [
  "docker pull registry.cn-shanghai.aliyuncs.com/pry/socks5:latest",
  "sudo docker run --rm -d --name socks5 -p 1080:1080 registry.cn-shanghai.aliyuncs.com/pry/socks5:latest",
];

const socksCheck = (ip: string) =>
  `curl -s --socks5 http://${ip}:1080 http://ifcfg.co`;

// 指定 ECS ID 執行 Socks 安裝
export async function installSocks(id: string, ip: string) {
  for (
    const { step, idx } of installSocksStep.map((step, idx) => ({ step, idx }))
  ) {
    const { success, msg } = await aliyunECS.runCommand(id, step);
    if (!success) {
      return msg;
    }
    sqliteDB.updateInstanceSocksStep(id, idx + 1);
  }
  const { success, msg } = await aliyunECS.runCommand(id, socksCheck(ip));
  if (success && msg.trim() === ip) {
    return msg;
  } else {
    return `Socks install failed, ${msg}`;
  }
}
