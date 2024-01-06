import { CronJob } from "@/core/decorators/cronJobDecorator";

class TestCronJob {
    @CronJob({ scope: "test", cronTime: "*/2 * * * * *" })
    job() {
        console.log("Doing the job...", new Date());
    }
}