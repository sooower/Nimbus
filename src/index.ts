import express from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import "reflect-metadata";

import { autoRegisterRoutes, globalConfig } from "./utils/core";
import { corsMiddleware } from "./middlewares/cors.middleware";
import bodyParser from "body-parser";

const app = express();

// Parse request body
app.use(bodyParser.json());

// Load swagger server
const swaggerDocument = JSON.parse(fs.readFileSync("/Users/Sower/Projects/FOMO/api.fomoremit.net/docs.json", "utf-8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Auto register routes
autoRegisterRoutes(app);

// Handle Cors
app.use(corsMiddleware);

// Run application
app.listen(globalConfig.port, () => {
    console.log(`App listening at http://localhost:${globalConfig.port}`);
});
