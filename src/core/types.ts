import { NextFunction, Request, Response } from "express";

export type Config = {
    port?: number;
};

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

export type ParamMetadataValue = {
    paramIdx: number;
    paramName?: string;
};

export type CtxSource =
    | "req"
    | "res"
    | "requestId"
    | "query"
    | "params"
    | "headers"
    | "body";

export type CtxMetadataValue = {
    source?: CtxSource;
    propertyKey: string;
    paramIdx: number;
};
