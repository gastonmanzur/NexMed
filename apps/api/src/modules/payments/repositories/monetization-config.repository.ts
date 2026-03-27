import { env } from '../../../config/env.js';
import type { monetizationModes, subscriptionPeriodModes } from '../models/monetization-config.model.js';
import { MonetizationConfigModel } from '../models/monetization-config.model.js';

export type MonetizationMode = (typeof monetizationModes)[number];
export type SubscriptionPeriodMode = (typeof subscriptionPeriodModes)[number];

export interface MonetizationConfig {
  monetizationMode: MonetizationMode;
  subscriptionPeriodMode: SubscriptionPeriodMode;
}

export class MonetizationConfigRepository {
  async getConfig(): Promise<MonetizationConfig> {
    const config = await MonetizationConfigModel.findOne({ singletonKey: 'default' }).lean();
    if (config) {
      return {
        monetizationMode: config.monetizationMode,
        subscriptionPeriodMode: config.subscriptionPeriodMode
      };
    }

    return {
      monetizationMode: env.MONETIZATION_MODE,
      subscriptionPeriodMode: env.SUBSCRIPTION_PERIOD_MODE
    };
  }
}
