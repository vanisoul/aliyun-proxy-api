import { Instance } from "@/sqlite/index";

export function isReady(instance: Instance) {
  return instance.start &&
    instance.docker &&
    instance.socks 
    // &&
    // instance.ipsecVpn;
}
