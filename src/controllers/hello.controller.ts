import { Request, Response } from "express";
import { Controller, Get, Post } from "../decorators/route.decorator";
import { Req, Res } from "../types/core";

@Controller("/hello")
export class HelloController {
    @Get("/sayHello")
    async sayHello(req: Req, res: Res) {
        const { name } = req.query;
        res.json({ hello: `${name}` });
    }

    @Post("/run")
    async run(req: Request, res: Response) {
        const { name } = req.body;
        res.json("This is running: " + name);
    }
}
