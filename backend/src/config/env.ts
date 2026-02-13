import dotenv from "dotenv";
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGO_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};

if (!env.mongoUri) throw new Error("Missing MONGO_URI");
if (!env.jwtSecret) throw new Error("Missing JWT_SECRET");
