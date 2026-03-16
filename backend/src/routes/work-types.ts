import { Router } from "express";
import { prisma } from "../db.js";

export const workTypesRouter = Router();

workTypesRouter.get("/work-types", async (_req, res, next) => {
  try {
    const workTypes = await prisma.workType.findMany({
      orderBy: { name: "asc" }
    });

    res.status(200).json(workTypes);
  } catch (error) {
    next(error);
  }
});
