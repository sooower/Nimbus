import { Next, Req, Res } from "@/core/types";
import { logger } from "@/core/components/logger";

export function errorMiddleware(err: any, req: Req, res: Res, next: Next) {
    logger.error(`[${err.requestId}]`, err);

    const { requestId, message, status } = err;

    return res.status(status ?? 500).json({
        requestId,
        message,
    });
}
