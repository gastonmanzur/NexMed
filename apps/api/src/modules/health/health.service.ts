import mongoose from 'mongoose';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  environment: 'development' | 'test' | 'production';
  readiness: {
    database: 'up' | 'down';
  };
}

export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.floor(process.uptime()),
  environment: process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'test' ? 'test' : 'development',
  readiness: {
    database: mongoose.connection.readyState === 1 ? 'up' : 'down'
  }
});
