import { Request, Response } from "express";

export type Config = {
    port?: number;
};

export type Req = Request;
export type Res = Response;
