import mongoose from 'mongoose';
import { GlobalWhatsAppSettingsModel, type GlobalWhatsAppSettingsDocument } from '../models/global-whatsapp-settings.model.js';

export class GlobalWhatsAppSettingsRepository {
  find(): Promise<GlobalWhatsAppSettingsDocument | null> { return GlobalWhatsAppSettingsModel.findOne({ key: 'global' }).exec(); }
  async resolve(): Promise<GlobalWhatsAppSettingsDocument> { return (await this.find()) ?? GlobalWhatsAppSettingsModel.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec() as Promise<GlobalWhatsAppSettingsDocument>; }
  async update(input: Partial<GlobalWhatsAppSettingsDocument>): Promise<GlobalWhatsAppSettingsDocument> { return GlobalWhatsAppSettingsModel.findOneAndUpdate({ key: 'global' }, { $set: input, $setOnInsert: { key: 'global' } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).exec() as Promise<GlobalWhatsAppSettingsDocument>; }
  async setOrganizationSuspended(organizationId: string, suspended: boolean, updatedByUserId?: string): Promise<GlobalWhatsAppSettingsDocument> {
    const oid = new mongoose.Types.ObjectId(organizationId);
    return GlobalWhatsAppSettingsModel.findOneAndUpdate({ key: 'global' }, { [suspended ? '$addToSet' : '$pull']: { suspendedOrganizationIds: oid }, $set: { updatedByUserId: updatedByUserId ? new mongoose.Types.ObjectId(updatedByUserId) : null }, $setOnInsert: { key: 'global' } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).exec() as Promise<GlobalWhatsAppSettingsDocument>;
  }
}
