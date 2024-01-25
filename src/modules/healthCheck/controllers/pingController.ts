import dayjs from "dayjs";

import { NonAuth } from "@/common/decorators/authorizationDecorator";
import { Controller, Get } from "@/common/decorators/routeDecorator";

@Controller("/ping")
export class PingController {
    @Get("/")
    @NonAuth()
    async get() {
        return `Now time: ${dayjs().format("YYYY/MM/DD HH:mm:ssZ")}`;
    }
}
