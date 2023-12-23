import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from "@/core/decorators/routeDecorator";
import { ds } from "@/core/components/dataSource";
import { User } from "@/entities/user";
import { CreateUserDto } from "@/models/user/createUserDto";
import {
    CacheEvict,
    CachePut,
    Cacheable,
} from "@/core/decorators/cacheDecorator";
import { logger } from "@/core/components/logger";

@Controller("/users")
export class UserController {
    @Post("/")
    async create(@Body() createUserDto: CreateUserDto) {
        const userRepository = ds.getRepository(User);
        const res = await userRepository.save(createUserDto);

        return res;
    }

    @Get("/:id")
    @Cacheable({ scope: "Users", key: ":userId", ttl: 120 })
    async get(@Param("id") userId: string) {
        logger.info("Running in `get` method");

        return { id: userId, name: "sower1" };
    }

    @Put("/:id")
    @CachePut({ scope: "Users", key: ":userId", ttl: 120 })
    async update(@Param("id") userId: string) {
        logger.info("Running in `update` method");

        return { id: userId, name: "sower2" };
    }

    @Delete("/:id")
    @CacheEvict({ scope: "Users", key: ":userId" })
    async remove(@Param("id") userId: string) {
        logger.info("Running in `remove` method");

        return true;
    }
}
