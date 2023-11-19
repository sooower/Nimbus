import { Request, Response } from "express";
import { Handler, Get, Post } from "../decorators/route.decorator";

@Handler("/hello")
export class HelloHandler {
    @Get("/sayHello")
    async sayHello(req: Request, res: Response) {
        const { name } = req.query;
        res.json(`Hello ${name}`);
    }

    @Post("/run")
    async run(req: Request, res: Response) {
        const { name } = req.body;
        res.json("This is running: " + name);
    }
}
