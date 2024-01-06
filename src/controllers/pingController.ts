import dayjs from "dayjs";

import { NonAuth } from "@/core/decorators/authorizationDecorator";
import { Controller, Get } from "@/core/decorators/routeDecorator";

@Controller("/ping")
export class PingController {
    @Get("/")
    @NonAuth()
    async get() {
        return `Now time: ${dayjs().format("YYYY/MM/DD HH:mm:ssZ")}`;
    }
}
