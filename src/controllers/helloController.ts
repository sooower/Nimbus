import {
    Body,
    Controller,
    Ctx,
    Get,
    Headers,
    Post,
    Query,
    StatusCode,
} from "@/core/decorators/routeDecorator";
import { ServiceError } from "@/core/errors";
import { logger } from "@/core/components/logger";

import { HelloCreateDto } from "@/models/hello/createDto";

@Controller("/")
export class HelloController {
    @Get("/")
    async get(
        @Query() query: { name: string; age: number; gender: boolean },
        @Ctx("requestId") reqId: string,
    ) {
        // Test throw error
        if (!false) {
            throw new ServiceError(reqId, 400, "0001", "Service Error");
        }

        return { ...query, reqId };
    }

    @Post("/")
    @StatusCode(201)
    async post(@Body() createDto: HelloCreateDto, @Headers() headers: any) {
        logger.debug("createDto", createDto);
        logger.info("headers", headers);
        return { createDto, headers };
    }
}
