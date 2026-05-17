import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LandingContentModel } from './models/landing-content.model.js';
import { defaultLandingContent } from './landing.defaults.js';

export class LandingService {
  private async ensureDoc() {
    let doc = await LandingContentModel.findOne({ key: 'main' });
    if (!doc) doc = await LandingContentModel.create({ key: 'main', draft: defaultLandingContent, published: defaultLandingContent, publishedAt: new Date() });
    return doc;
  }
  getPublished = async () => (await this.ensureDoc()).published;
  getAdminState = async () => {
    const doc = await this.ensureDoc();
    return { draft: doc.draft, published: doc.published, publishedAt: doc.publishedAt, updatedAt: doc.updatedAt };
  };
  saveDraft = async (draft: unknown) => {
    const doc = await this.ensureDoc(); doc.draft = draft as never; await doc.save(); return this.getAdminState();
  };
  publish = async () => {
    const doc = await this.ensureDoc(); doc.published = doc.draft; doc.publishedAt = new Date(); await doc.save(); return this.getAdminState();
  };
  uploadMedia = async (file: Express.Multer.File) => {
    const dir = path.resolve(process.cwd(), 'uploads/landing');
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fullPath = path.join(dir, filename);
    await writeFile(fullPath, file.buffer);
    return { url: `/media/landing/${filename}`, mimeType: file.mimetype, sizeBytes: file.size };
  };
  deleteMedia = async (relativeUrl: string) => { const full = path.resolve(process.cwd(), 'uploads/landing', path.basename(relativeUrl)); await unlink(full).catch(() => undefined); };
}
