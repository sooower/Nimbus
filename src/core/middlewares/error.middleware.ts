import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types/common";

export function errorMiddleware(
    err: ServiceError,
    req: Req,
    res: Res,
    next: Next,
) {
    console.error(err.stack);

    res.status(err.status || 500).json({
        code: err.code || "500",
        message: err.message,
    });
    return;
}
