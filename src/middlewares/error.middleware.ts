import { Req, Res, Next } from "../types/core";

export function errorMiddleware(err: any, req: Req, res: Res, next: Next) {
    console.error(err.stack);

    res.status(err.status || 500).json({
        code: err.code || "500",
        message: err.message,
    });
    return;
}
