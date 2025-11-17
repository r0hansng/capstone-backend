import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("MySQL connected successfully!");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

export { prisma };