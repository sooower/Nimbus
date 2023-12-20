import {
    Body,
    Controller,
    Ctx,
    Get,
    Headers,
    Post,
    Query,
    StatusCode,
} from "@/core/decorators/route.decorator";
import { ServiceError } from "@/core/errors";

import { HelloCreateDto } from "@/models/hello/createDto";

@Controller("/")
export class HelloController {
    @Get("/")
    async get(
        @Query() query: { name: string; age: number; gender: boolean },
        @Ctx("requestId") reqId: string,
    ) {
        // Test throw error
        if (false) {
            throw new ServiceError(reqId, 400, "0001", "Service Error");
        }

        return { ...query, reqId };
    }

    @Post("/")
    @StatusCode(201)
    async post(@Body() createDto: HelloCreateDto, @Headers() headers: any) {
        console.log("createDto", createDto);
        console.log("headers", headers);
        return { createDto, headers };
    }
}
