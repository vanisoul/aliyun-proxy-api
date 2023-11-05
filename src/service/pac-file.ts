export function generatePACFile(hosts: string[], ip: string) {
  let pacScript = `function FindProxyForURL(url, host) {
  `;

  hosts.forEach((host) => {
    pacScript += `    if (shExpMatch(host, "${host}")) {
          return "SOCKS5 ${ip}:1080;DIRECT";
      }
  `;
  });

  pacScript += `    return "DIRECT";
  }`;

  return pacScript;
}
