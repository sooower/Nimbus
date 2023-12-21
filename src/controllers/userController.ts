import { Body, Controller, Post } from "@/core/decorators/routeDecorator";
import { ds } from "@/core/components/dataSource";
import { User } from "@/entities/user";
import { CreateUserDto } from "@/models/user/createUserDto";

@Controller("/users")
export class UserController {
    @Post("/")
    async create(@Body() createUserDto: CreateUserDto) {
        const userRepository = ds.getRepository(User);
        const res = await userRepository.save(createUserDto);
        return res;
    }
}
