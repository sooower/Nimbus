import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";

import { corsMiddleware } from "./core/middlewares/corsMiddleware";
import { errorMiddleware } from "./core/middlewares/errorMiddleware";
import { globalConfig } from "./core/components/config";
import { autoRegisterRoutes } from "./core/utils/route";
import { logger } from "./core/components/logger";

const app = express();

// Handle cors
app.use(corsMiddleware);

// Parse request body
app.use(bodyParser.json());

// Auto register routes
autoRegisterRoutes(app);

// Handle global error
app.use(errorMiddleware);

// Run application
app.listen(globalConfig.port, () => {
    logger.info(`App listening at http://localhost:${globalConfig.port}`);
});
