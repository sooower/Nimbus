import { Controller, Get } from "@/core/decorators/routeDecorator";
import { NonAuth } from "@/core/decorators/nonAuthDecorator";
import dayjs from "dayjs";

@Controller("/ping")
export class PingController {
    @Get("/")
    @NonAuth
    async get() {
        return `Now time: ${dayjs().format("YYYY/MM/DD HH:mm:ssZ")}`;
    }
}
