import { aliyunECS } from "@/aliyun/index";
import { sqliteDB } from "@/sqlite";

const generateRandomAlphanumeric = (length = 10) =>
  [...Array(length)]
    .map(() => (~~(Math.random() * 36)).toString(36))
    .join("");

export const installVpnStep = (psk: string, user: string, password: string) => [
  "docker pull hwdsl2/ipsec-vpn-server",
  "rm -rf /tmp/vpn.env",
  "touch /tmp/vpn.env",
  `echo 'VPN_IPSEC_PSK=${psk}' >> /tmp/vpn.env`,
  `echo 'VPN_USER=${user}' >> /tmp/vpn.env`,
  `echo 'VPN_PASSWORD=${password}' >> /tmp/vpn.env`,
  "sudo docker run --name ipsec-vpn-server --env-file /tmp/vpn.env -p 500:500/udp -p 4500:4500/udp -d --rm --privileged hwdsl2/ipsec-vpn-server",
];

// const VpnCheck = "Vpn --version";

// 指定 ECS ID 執行 Vpn 安裝
export async function installVpn(id: string) {
  const psk = generateRandomAlphanumeric();
  const user = generateRandomAlphanumeric();
  const password = generateRandomAlphanumeric();

  for (
    const { step, idx } of installVpnStep(psk, user, password).map((
      step,
      idx,
    ) => ({
      step,
      idx,
    }))
  ) {
    const { success, msg } = await aliyunECS.runCommand(id, step);
    if (!success) {
      return msg;
    }
    sqliteDB.updateInstanceIpsecVpnStep(id, idx + 1);
  }
  sqliteDB.setInstanceIpsec(id, psk, user, password);
}
