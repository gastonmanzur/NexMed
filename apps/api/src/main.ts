import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const bootstrap = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`API running on port ${env.PORT}`);
  });
};

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
