import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { dropLegacySpecialtyIndexes } from './modules/professionals/models/specialty.model.js';

const bootstrap = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  await dropLegacySpecialtyIndexes();

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`API running on port ${env.PORT}`);
  });
};

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
