import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types";
import { logger } from "../utils/logger";

export function errorMiddleware(
    err: ServiceError,
    req: Req,
    res: Res,
    next: Next,
) {
    logger.error(`[${err.requestId}]`, err);

    if (err instanceof ServiceError) {
        const { status, requestId, code, message, stack } = err;
        return res.status(status).json({
            requestId,
            code,
            message,
        });
    }

    return res.status(500).json({
        code: "500",
        message: "Internal Server Error",
    });
}
