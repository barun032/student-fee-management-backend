import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
  logger.info('✅ MongoDB connected');
  return mongoose.connection;
};

export const disconnectMongo = async () => {
  await mongoose.disconnect();
};

export { mongoose };