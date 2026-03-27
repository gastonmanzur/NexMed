import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env.js';
import { AppError } from '../../../core/errors.js';
import type { FileStorageProvider } from './storage-provider.js';

export class LocalStorageProvider implements FileStorageProvider {
  constructor(
    private readonly rootDir: string,
    private readonly publicBasePath: string
  ) {}

  async put(input: { buffer: Buffer; extension: string; mimeType: string }) {
    await mkdir(this.rootDir, { recursive: true });
    const key = `${Date.now()}-${randomUUID()}.${input.extension}`;
    const filePath = path.join(this.rootDir, key);
    await writeFile(filePath, input.buffer);
    return {
      key,
      url: `${env.APP_BASE_URL}${this.publicBasePath}/${key}`,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength
    };
  }

  async remove(key: string): Promise<void> {
    const filePath = path.join(this.rootDir, key);
    try {
      await rm(filePath, { force: true });
    } catch {
      throw new AppError('AVATAR_DELETE_FAILED', 500, 'Unable to remove avatar file');
    }
  }
}
