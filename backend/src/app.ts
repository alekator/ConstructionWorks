import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { workLogsRouter } from "./routes/work-logs.js";
import { workTypesRouter } from "./routes/work-types.js";

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", workTypesRouter);
  app.use("/api", workLogsRouter);

  app.use(errorHandler);

  return app;
};
