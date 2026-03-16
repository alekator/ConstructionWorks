import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .transform((value) => new Date(value));

const createWorkLogSchema = z.object({
  performedAt: isoDateSchema,
  workTypeId: z.string().min(1),
  volumeValue: z.coerce.number().positive(),
  volumeUnit: z.string().min(1).max(20),
  workerName: z.string().min(2).max(120)
});

const updateWorkLogSchema = createWorkLogSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required for update"
);

const listQuerySchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  sort: z.enum(["asc", "desc"]).default("desc")
});

const mapWorkLog = (log: {
  id: string;
  performedAt: Date;
  volumeValue: { toString(): string };
  volumeUnit: string;
  workerName: string;
  workTypeId: string;
  createdAt: Date;
  updatedAt: Date;
  workType: { id: string; name: string };
}) => ({
  id: log.id,
  performedAt: log.performedAt.toISOString(),
  volumeValue: Number(log.volumeValue.toString()),
  volumeUnit: log.volumeUnit,
  workerName: log.workerName,
  workTypeId: log.workTypeId,
  createdAt: log.createdAt.toISOString(),
  updatedAt: log.updatedAt.toISOString(),
  workType: log.workType
});

export const workLogsRouter = Router();

workLogsRouter.get("/work-logs", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);

    const where: {
      performedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (query.dateFrom || query.dateTo) {
      where.performedAt = {};
    }

    if (query.dateFrom) {
      where.performedAt!.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    }

    if (query.dateTo) {
      where.performedAt!.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        workType: true
      },
      orderBy: {
        performedAt: query.sort
      }
    });

    res.status(200).json(logs.map(mapWorkLog));
  } catch (error) {
    next(error);
  }
});

workLogsRouter.post("/work-logs", async (req, res, next) => {
  try {
    const payload = createWorkLogSchema.parse(req.body);

    const created = await prisma.workLog.create({
      data: {
        performedAt: payload.performedAt,
        workTypeId: payload.workTypeId,
        volumeValue: payload.volumeValue,
        volumeUnit: payload.volumeUnit,
        workerName: payload.workerName
      },
      include: {
        workType: true
      }
    });

    res.status(201).json(mapWorkLog(created));
  } catch (error) {
    next(error);
  }
});

workLogsRouter.put("/work-logs/:id", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const payload = updateWorkLogSchema.parse(req.body);

    const updated = await prisma.workLog.update({
      where: { id },
      data: payload,
      include: {
        workType: true
      }
    });

    res.status(200).json(mapWorkLog(updated));
  } catch (error) {
    next(error);
  }
});

workLogsRouter.delete("/work-logs/:id", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

    await prisma.workLog.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
