import { CronJob } from "@/core/decorators/cronJobDecorator";

class TestCronJob {
    @CronJob("*/2 * * * * *")
    job() {
        console.log("Doing the job...", new Date());
    }
}
