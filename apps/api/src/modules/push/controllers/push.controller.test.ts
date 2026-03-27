import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { pushController } from './push.controller.js';

describe('push controller validation', () => {
  it('rejects invalid register payload', async () => {
    await expect(
      pushController.register(
        { body: { token: 'short', platform: 'web', channel: 'web_push' }, auth: { userId: 'u1', role: 'user', email: 'u@test.com' }, headers: {} } as never,
        { status: () => ({ json: () => undefined }) } as never
      )
    ).rejects.toBeInstanceOf(ZodError);
  });
});
