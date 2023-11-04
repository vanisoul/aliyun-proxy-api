import { CronJob } from "cron";
import { clearInstance } from "@/service/clear-instance";

// 定期清除管理之外的實例
export const clearInstanceJob = CronJob.from({
  cronTime: "*/10 * * * *",
  onTick: function () {
    console.log("clearInstanceJob");
    clearInstance();
  },
  start: true,
  timeZone: "Asia/Taipei",
});
