import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  workType: {
    findMany: vi.fn()
  },
  workLog: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("../db.js", () => ({
  prisma: prismaMock
}));

import { createApp } from "../app.js";

describe("API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/health returns ok", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("GET /api/work-types returns directory list", async () => {
    prismaMock.workType.findMany.mockResolvedValue([
      { id: "wt1", name: "Монтаж опалубки" },
      { id: "wt2", name: "Армирование перекрытий" }
    ]);

    const app = createApp();
    const response = await request(app).get("/api/work-types");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(prismaMock.workType.findMany).toHaveBeenCalledTimes(1);
  });

  it("GET /api/work-logs supports date filter and sort", async () => {
    prismaMock.workLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        performedAt: new Date("2026-03-12T00:00:00.000Z"),
        volumeValue: { toString: () => "24" },
        volumeUnit: "м3",
        workerName: "Иванов Иван Иванович",
        workTypeId: "wt1",
        createdAt: new Date("2026-03-12T10:00:00.000Z"),
        updatedAt: new Date("2026-03-12T10:00:00.000Z"),
        workType: { id: "wt1", name: "Монтаж опалубки" }
      }
    ]);

    const app = createApp();
    const response = await request(app)
      .get("/api/work-logs")
      .query({ dateFrom: "2026-03-01", dateTo: "2026-03-31", sort: "asc" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].volumeValue).toBe(24);
    expect(prismaMock.workLog.findMany).toHaveBeenCalledTimes(1);
  });

  it("POST /api/work-logs validates payload", async () => {
    const app = createApp();
    const response = await request(app).post("/api/work-logs").send({ workerName: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });
});