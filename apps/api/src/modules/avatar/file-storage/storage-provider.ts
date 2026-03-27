export interface FileStorageProvider {
  put(input: { buffer: Buffer; extension: string; mimeType: string }): Promise<{
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  remove(key: string): Promise<void>;
}
