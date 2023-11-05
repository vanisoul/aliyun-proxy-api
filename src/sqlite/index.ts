import { Database } from "bun:sqlite";

// 建立 Step Type 使用 "docker", "socks", "ipsecVpn"
type StepType = "docker" | "socks" | "ipsecVpn";

// 建立 DB 兩張表的 interface
export interface User {
  id: number;
  name: string;
}

export interface Instance {
  id: string;
  name: string;
  owner: string;
  ip: string;
  start: boolean;
  docker: boolean;
  dockerStep: number;
  dockerStepTotal: number;
  socks: boolean;
  socksStep: number;
  socksStepTotal: number;
  ipsecVpn: boolean;
  ipsecVpnStep: number;
  ipsecVpnStepTotal: number;
}

class Sqlite {
  private db: Database;
  constructor() {
    const db = new Database("", { create: true });
    this.db = db;
    this.initDatabase();
  }

  // 新增一個 instance, 只需要指定 id, name, owner, StepTotal
  createInstance(
    id: string,
    name: string,
    owner: string,
    dockerStepTotal: number,
    socksStepTotal: number,
    ipsecVpnStepTotal: number,
  ): void {
    this.db.exec(`
      INSERT INTO instances (id, name, owner, dockerStepTotal, socksStepTotal, ipsecVpnStepTotal) VALUES ('${id}', '${name}', '${owner}', ${dockerStepTotal}, ${socksStepTotal}, ${ipsecVpnStepTotal});
      `);
  }

  // 刪除一個 instance, 只需要指定 id
  deleteInstance(id: string): void {
    this.db.exec(`
      DELETE FROM instances WHERE id='${id}';
      `);
  }

  // 根據 id 啟動一個 instance, 只需要指定 id
  startInstance(id: string): void {
    this.db.exec(`
      UPDATE instances SET start=true WHERE id='${id}';
      `);
  }

  // 根據 id 設定 ip
  setInstanceIp(id: string, ip: string): void {
    this.db.exec(`
      UPDATE instances SET ip='${ip}' WHERE id='${id}';
      `);
  }

  // 更新一個 instance 的 dockerStep, 只需要指定 id, Step, 並且 Step == StepTotal 時, 將 docker 設為 true
  updateInstanceDockerStep(id: string, step: number): void {
    this.updateInstanceStep(id, step, "docker");
  }

  // 更新一個 instance 的 socksStep, 只需要指定 id, Step, 並且 Step == StepTotal 時, 將 socks 設為 true
  updateInstanceSocksStep(id: string, step: number): void {
    this.updateInstanceStep(id, step, "socks");
  }

  // 更新一個 instance 的 ipsecVpnStep, 只需要指定 id, Step, 並且 Step == StepTotal 時, 將 ipsecVpn 設為 true
  updateInstanceIpsecVpnStep(id: string, step: number): void {
    this.updateInstanceStep(id, step, "ipsecVpn");
  }

  // 根據 instance id, 更新 其各類 Step 是否完成, 完成時將相對應的 boolean 設為 true
  updateInstanceStep(id: string, step: number, type: StepType): void {
    this.db.exec(`
                    UPDATE instances SET ${type}Step=${step} WHERE id='${id}';
                    `);
    // 判斷 step 是否等於 stepTotal, 如果等於, 將 docker 設為 true
    const instance = this.db.query<Instance, []>(`
                    SELECT * FROM instances WHERE id='${id}';
                    `);
    const instances = instance.all();
    instances.forEach((instance) => {
      if (instance[`${type}Step`] === instance[`${type}StepTotal`]) {
        this.db.exec(`
                        UPDATE instances SET ${type}=true WHERE id='${id}';
                        `);
      }
    });
  }

  // 得到所有 instance
  getInstances(): Instance[] {
    const instance = this.db.query<Instance, []>(`
        SELECT * FROM instances;
        `);
    return instance.all();
  }

  // 指定 id 得到其對應的 instance
  getInstanceById(id: string): Instance | null {
    const instance = this.db.query<Instance, []>(`
        SELECT * FROM instances WHERE id='${id}';
        `);
    const data = instance.get();
    return data;
  }

  // 清空 Database
  clearDatabase(): void {
    this.db.exec(`
        DELETE FROM users;
        `);
    this.db.exec(`
        DELETE FROM instances;
        `);
  }

  // 根據所有 instance 中, 確認是否有正在執行的 instance, 透過各服務的 boolean 值, 有其中一個非 true, 則代表正在執行
  getRunningInstance(): boolean {
    const instance = this.db.query<Instance, []>(`
        SELECT * FROM instances;
        `);
    const instances = instance.all();
    for (const instance of instances) {
      if (
        !instance.start ||
        !instance.docker ||
        !instance.socks ||
        !instance.ipsecVpn
      ) {
        return true;
      }
    }
    return false;
  }

  // 初始化資料表
  // 表1: users
  // - id:唯一編號
  // - name:名稱
  // 表2: instances
  // - id:唯一辨識字串, 需要加入時自己指定為字串
  // - name:instanceName
  // - owner:擁有者
  // - ip:IP 位置
  // - start:是否啟動, 預設 false
  // - docker:是否安裝 docker, 預設 false
  // - dockerStep:安裝 docker 的步驟, 預設 0
  // - dockerStepTotal:安裝 docker 的步驟總數, 預設 0
  // - socks:是否啟動 serjs/go-socks5-proxy, 預設 false
  // - socks:啟動 socks 步驟, 預設 0
  // - socks:啟動 socks 步驟總數, 預設 0
  // - ipsec-vpn:是否啟動 hwdsl2/ipsec-vpn-server, 預設 false
  // - ipsec-vpn:啟動 ipsec-vpn 步驟, 預設 0
  // - ipsec-vpn:啟動 ipsec-vpn 步驟總數, 預設 0
  // 開始 init database
  private initDatabase(): void {
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        `);
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS instances (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner TEXT NOT NULL,
            ip TEXT,
            start BOOLEAN DEFAULT FALSE,
            docker BOOLEAN DEFAULT FALSE,
            dockerStep INTEGER DEFAULT 0,
            dockerStepTotal INTEGER DEFAULT 0,
            socks BOOLEAN DEFAULT FALSE,
            socksStep INTEGER DEFAULT 0,
            socksStepTotal INTEGER DEFAULT 0,
            ipsecVpn BOOLEAN DEFAULT FALSE,
            ipsecVpnStep INTEGER DEFAULT 0,
            ipsecVpnStepTotal INTEGER DEFAULT 0
        );
        `);
    this.initUsers();
  }

  // 開始 init users
  private initUsers(): void {
    this.db.exec(`
        INSERT INTO users (name) VALUES ('admin');
        `);
  }
}

export const sqliteDB = new Sqlite();
