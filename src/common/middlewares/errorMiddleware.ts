import { loggerService } from "../services/loggerService";
import { Next, Req, Res } from "../types";

export function errorMiddleware(err: any, req: Req, res: Res, next: Next) {
    loggerService.error(`[${err.requestId}]`, err);

    const { requestId, message, status } = err;

    return res.status(status ?? 500).json({
        requestId,
        message,
    });
}
