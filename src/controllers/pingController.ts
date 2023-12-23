import { Controller, Get } from "@/core/decorators/routeDecorator";
import dayjs from "dayjs";

@Controller("/ping")
export class PingController {
    @Get("/")
    async get() {
        return `Now time: ${dayjs().format("YYYY/MM/DD HH:mm:ssZ")}`;
    }
}
