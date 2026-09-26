import app from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import { logger } from './utils/logger.js';

const start = async () => {
  try {
    await connectMongo();

    app.listen(env.port, () => {
      logger.info(`🚀 API running on http://localhost:${env.port}`);
      logger.info(`   Environment: ${env.nodeEnv}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down…');
  await disconnectMongo();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();