import { NextFunction, Request, Response } from "express";

export type Req = Request;
export type Res = Response;
export type Next = NextFunction;

export type Context = {
    req: Req;
    res: Res;
    query: any;
    params: any;
    headers: any;
    body: any;
    requestId: string;
};

export type MiddlewareFunc = (req: Req, res: Res, next: Next) => Promise<void>;
