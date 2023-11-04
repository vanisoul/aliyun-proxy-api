import * as OpenApiLib from "@alicloud/openapi-client";
import ECSClient, * as ECSClientLib from "@alicloud/ecs20140526";
import * as Util from "@alicloud/tea-util";
import { v4 as uuidv4 } from "uuid";

// 建立一個阿里雲客戶端對象
export class Client {
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
  async describeInstances(): Promise<any> {
    const describeInstancesRequest = new ECSClientLib.DescribeInstancesRequest({
      regionId: this.regionId,
    });
    const runtime = new Util.RuntimeOptions({});
    const resp = await this.client.describeInstancesWithOptions(
      describeInstancesRequest,
      runtime,
    );

    return resp.body;
  }

  // 建立一個ECS實例
  async createInstance(): Promise<any> {
    const instanceName = uuidv4();

    const systemDisk = new ECSClientLib.CreateInstanceRequestSystemDisk({
      size: 20,
      category: "cloud_efficiency",
    });
    const createInstanceRequest = new ECSClientLib.CreateInstanceRequest({
      regionId: this.regionId,
      imageId: "ubuntu_22_04_x64_20G_alibase_20230907.vhd",
      instanceName: `Z-${instanceName}`,
      instanceType: "ecs.t6-c2m1.large",
      internetChargeType: "PayByTraffic",
      internetMaxBandwidthOut: 50,
      systemDisk: systemDisk,
      instanceChargeType: "PostPaid",
      period: 1,
      periodUnit: "Hourly",
      securityEnhancementStrategy: "Active",
      dryRun: false,
    });
    const runtime = new Util.RuntimeOptions({
      connectTimeout: this.connectTimeout,
    });
    const resp = await this.client.createInstanceWithOptions(
      createInstanceRequest,
      runtime,
    );

    return resp;
  }
}
