import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      issues: error.issues
    });
    return;
  }

  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({ message: "Record not found" });
    return;
  }

  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    res.status(400).json({ message: "Invalid relation value" });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
};
