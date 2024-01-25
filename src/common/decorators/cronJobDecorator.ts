import { CronJob as Job } from "cron";

import { configService } from "../services/configService";
import { loggerService } from "../services/loggerService";

export function CronJob(options: {
    scope: string;
    cronTime: string;
    timeZone?: string;
}): MethodDecorator {
    return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
        const cronJobs: { scope: string; start: boolean }[] = configService.cronJobs ?? [];
        if (cronJobs.length === 0) {
            return;
        }

        const jobMap = new Map<string, boolean>();
        cronJobs.forEach(it => {
            jobMap.set(it.scope, it.start);
        });

        const { scope, cronTime, timeZone } = options;
        if (jobMap.get(scope) ?? false) {
            new Job(cronTime, descriptor.value, null, true, timeZone ?? "Asia/Shanghai").start();
            loggerService.info(`CronJob [${scope}::${String(key)}] is started.`);
        }
    };
}
