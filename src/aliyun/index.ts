import * as OpenApiLib from "@alicloud/openapi-client";
import ECSClient, * as ECSClientLib from "@alicloud/ecs20140526";
import * as Util from "@alicloud/tea-util";
import { v4 as uuidv4 } from "uuid";
import aliyrnJson from "@/data/aliyun.json";

// 建立一個阿里雲客戶端對象
class Client {
  private client: ECSClient;
  private regionId: string;
  private connectTimeout = 20000;

  constructor(
    accessKeyId: string,
    accessKeySecret: string,
    endpoint: string,
    regionId: string,
  ) {
    const config = new OpenApiLib.Config({
      // 必填，您的 AccessKey ID
      accessKeyId: accessKeyId,
      // 必填，您的 AccessKey Secret
      accessKeySecret: accessKeySecret,
      // Endpoint 请参考 https://api.aliyun.com/product/Ecs
      endpoint: endpoint,
    });

    this.client = new ECSClient(config);
    this.regionId = regionId;
  }

  // 查詢目前所有的ECS實例
  async describeInstances(): Promise<
    ECSClientLib.DescribeInstancesResponseBody
  > {
    console.log("============== describeInstances ==============");
    const describeInstancesRequest = new ECSClientLib.DescribeInstancesRequest({
      regionId: this.regionId,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.describeInstancesWithOptions(
      describeInstancesRequest,
      runtime,
    );

    console.log("============== describeInstances ==============");
    return resp.body;
  }

  // 根據 id 查詢 ECS 實例 為 status: "Stopped"
  async describeStoppedInstance(id: string): Promise<boolean> {
    console.log("============== describeStoppedInstance ==============");
    const status = await this.describeInstanceStatus(id);
    const stopped = status === "Stopped";
    console.log("============== describeStoppedInstance ==============");
    return stopped;
  }

  // 根據 id 查詢 ECS 實例 為 status: "Running"
  async describeRunningInstance(id: string): Promise<boolean> {
    console.log("============== describeStoppedInstance ==============");
    const status = await this.describeInstanceStatus(id);
    const running = status === "Running";
    console.log("============== describeStoppedInstance ==============");
    return running;
  }

  // 根據 id 查看 ECS 實例 狀態
  async describeInstanceStatus(
    id: string,
  ): Promise<string> {
    console.log("============== describeInstanceStatus ==============");
    const describeInstancesRequest = new ECSClientLib
      .DescribeInstanceStatusRequest({
      regionId: this.regionId,
      instanceId: [id],
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.describeInstanceStatusWithOptions(
      describeInstancesRequest,
      runtime,
    );
    const status = resp.body.instanceStatuses?.instanceStatus
      ?.[0].status;
    console.log("============== describeInstanceStatus ==============");
    return status ?? "";
  }

  // 根據 id 查詢 ECS 實例
  async describeInstance(
    id: string,
  ): Promise<ECSClientLib.DescribeInstancesResponseBody> {
    console.log("============== describeInstance ==============");
    const describeInstancesRequest = new ECSClientLib.DescribeInstancesRequest({
      regionId: this.regionId,
      instanceIds: [id],
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.describeInstancesWithOptions(
      describeInstancesRequest,
      runtime,
    );
    console.log("============== describeInstance ==============");
    return resp.body;
  }

  // 建立一個ECS實例
  async createInstance(): Promise<
    { instanceName: string; instanceId: string | undefined }
  > {
    console.log("============== createInstance ==============");

    const instanceUUIDv4 = uuidv4();
    const instanceName = `Z-${instanceUUIDv4}`;

    const systemDisk = new ECSClientLib.CreateInstanceRequestSystemDisk({
      size: 20,
      category: "cloud_efficiency",
    });
    const createInstanceRequest = new ECSClientLib.CreateInstanceRequest({
      regionId: this.regionId,
      imageId: "ubuntu_22_04_x64_20G_alibase_20230907.vhd",
      instanceName,
      instanceType: "ecs.t6-c2m1.large",
      internetChargeType: "PayByTraffic",
      internetMaxBandwidthOut: 50,
      systemDisk: systemDisk,
      instanceChargeType: "PostPaid",
      period: 1,
      periodUnit: "Hourly",
      securityEnhancementStrategy: "Active",
      vSwitchId: "vsw-uf6bh9eji5ik2v22irrcr",
      dryRun: false,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.createInstanceWithOptions(
      createInstanceRequest,
      runtime,
    );

    console.log(resp.body);
    console.log("============== createInstance ==============");
    return { instanceName, instanceId: resp.body.instanceId };
  }

  // 根據ID刪除ECS實例
  async deleteInstance(ids: string[]): Promise<any> {
    console.log("============== deleteInstances ==============");
    if (ids.length === 0) {
      return { msg: "instanceIds is empty" };
    }
    try {
      const deleteInstanceRequest = new ECSClientLib.DeleteInstancesRequest({
        regionId: this.regionId,
        instanceId: ids,
        force: true,
      });
      const runtime = new Util.RuntimeOptions({
        connectTimeout: this.connectTimeout,
      });
      const resp = await this.client.deleteInstancesWithOptions(
        deleteInstanceRequest,
        runtime,
      );
      console.log("============== deleteInstances ==============");
      return resp.body;
    } catch (error: unknown) {
      console.log("============== deleteInstances ==============");
      return (error as { code: string }).code;
    }
  }

  // 根據ID啟動ECS實例
  async startInstance(
    id: string,
  ): Promise<ECSClientLib.StartInstanceResponseBody> {
    console.log("============== startInstance ==============");
    const startInstanceRequest = new ECSClientLib.StartInstanceRequest({
      instanceId: id,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.startInstanceWithOptions(
      startInstanceRequest,
      runtime,
    );

    console.log("============== startInstance ==============");
    return resp.body;
  }

  // 根據ID 取得 IP 位置
  async getInstanceIp(id: string): Promise<string | undefined> {
    const describeInstancesRequest = new ECSClientLib
      .AllocatePublicIpAddressRequest({
      regionId: this.regionId,
      instanceId: id,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.allocatePublicIpAddressWithOptions(
      describeInstancesRequest,
      runtime,
    );
    // 取得第一個 instance 的第一個 publicIpAddress
    return resp.body.ipAddress;
  }

  // 根據ID 執行指令
  async runCommand(
    id: string,
    command: string,
  ): Promise<{ success: boolean; msg: string }> {
    console.log("============== runCommand ==============");
    console.log(`id: ${id}`);
    console.log(`command: ${command}`);
    // 執行命令
    const invokeCommandRequest = new ECSClientLib.RunCommandRequest({
      regionId: this.regionId,
      type: "RunShellScript",
      commandContent: command,
      workingDir: "/root/",
      repeatMode: "Once",
      instanceId: [
        id,
      ],
      contentEncoding: "PlainText",
      timeout: 600,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.runCommandWithOptions(
      invokeCommandRequest,
      runtime,
    );

    // 迴圈呼叫 DescribeInvocationsRequest API, 直到 command 執行完畢
    const getInvokeCommandRequest = new ECSClientLib.DescribeInvocationsRequest(
      {
        regionId: this.regionId,
        invokeId: resp.body.invokeId,
        includeOption: true,
      },
    );
    const runtime2 = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    while (true) {
      const resp2 = await this.client.describeInvocationsWithOptions(
        getInvokeCommandRequest,
        runtime2,
      );
      const invocation = resp2.body.invocations?.invocation?.[0]
        ?.invokeInstances?.invokeInstance?.[0];

      console.log(invocation);

      if (invocation == null) {
        return { success: false, msg: "invocation is null" };
      }

      if (invocation.instanceInvokeStatus == "Running") {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (invocation.instanceInvokeStatus == "Finished") {
        const str = invocation.output as string;
        const decodedString = Buffer.from(str, "base64")
          .toString("utf8");
        console.log(decodedString);
        if (invocation.invocationStatus !== "Success") {
          return {
            success: false,
            msg:
              `invocationStatus is not Success, ${invocation.invocationStatus}`,
          };
        } else {
          return {
            success: true,
            msg: decodedString,
          };
        }
      } else {
        return {
          success: false,
          msg:
            `instanceInvokeStatus is ${invocation.instanceInvokeStatus}, command: ${command}`,
        };
      }
    }
  }
}

export const aliyunECS = new Client(
  aliyrnJson.accessKeyId,
  aliyrnJson.accessKeySecret,
  aliyrnJson.endpoint,
  aliyrnJson.regionId,
);
