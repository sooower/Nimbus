import { logger } from "../components/logger";
import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types";

export function errorMiddleware(
    err: ServiceError,
    req: Req,
    res: Res,
    next: Next,
) {
    logger.error(`[${err.requestId}]`, err);

    if (err instanceof ServiceError) {
        const { status, requestId, message } = err;

        return res.status(status).json({
            requestId,
            message,
        });
    }

    return res.status(500).json("Internal Server Error");
}
