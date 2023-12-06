import express from "express";
import swaggerUi from "swagger-ui-express";
import "reflect-metadata";

import { autoRegisterRoutes, globalConfig } from "./utils/core";
import { corsMiddleware } from "./middlewares/cors.middleware";
import bodyParser from "body-parser";
import apiDocuments from "../../../FOMO/Codes/api.fomoremit.net/api-docs.json";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

// Handle cors
app.use(corsMiddleware);

// Parse request body
app.use(bodyParser.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(apiDocuments));

// Auto register routes
autoRegisterRoutes(app);

// Handle global error
app.use(errorMiddleware);

// Run application
app.listen(globalConfig.port, () => {
    console.log(`App listening at http://localhost:${globalConfig.port}`);
});
