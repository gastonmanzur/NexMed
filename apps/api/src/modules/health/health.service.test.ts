import { describe, expect, it } from 'vitest';
import { getHealthStatus } from './health.service.js';

describe('getHealthStatus', () => {
  it('returns healthy status payload', () => {
    const result = getHealthStatus();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});
