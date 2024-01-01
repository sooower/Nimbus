import { CronJob as Job } from "cron";
import { globalConfig } from "@/core/components/config";
import { logger } from "@/core/components/logger";

export function CronJob(options: {
    scope: string;
    cronTime: string;
    timeZone?: string;
}): MethodDecorator {
    return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
        const cronJobs: { scope: string; start: boolean }[] = globalConfig.cronJobs ?? [];
        if (cronJobs.length === 0) {
            return;
        }

        const jobs = new Map<string, boolean>();
        cronJobs.forEach(it => {
            jobs.set(it.scope, it.start);
        });

        const { scope, cronTime, timeZone } = options;
        if (jobs.get(scope) ?? false) {
            new Job(cronTime, descriptor.value, null, true, timeZone ?? "Asia/Shanghai").start();
            logger.info(`CronJob [${scope}::${String(key)}] is started.`);
        }
    };
}
