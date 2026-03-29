import { OrganizationSettingsModel, type OrganizationSettingsDocument } from '../models/organization-settings.model.js';

interface UpsertOrganizationSettingsInput {
  organizationId: string;
  timezone: string;
  locale?: string | undefined;
  currency?: string | undefined;
  onboardingStep?: string | undefined;
  patientCancellationAllowed?: boolean | undefined;
  patientCancellationHoursLimit?: number | undefined;
  patientRescheduleAllowed?: boolean | undefined;
  patientRescheduleHoursLimit?: number | undefined;
}

export class OrganizationSettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<OrganizationSettingsDocument | null> {
    return OrganizationSettingsModel.findOne({ organizationId }).exec();
  }

  async upsertByOrganizationId(input: UpsertOrganizationSettingsInput): Promise<OrganizationSettingsDocument> {
    return OrganizationSettingsModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      {
        $set: {
          timezone: input.timezone,
          ...(input.locale !== undefined ? { locale: input.locale } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.onboardingStep !== undefined ? { onboardingStep: input.onboardingStep } : {}),
          ...(input.patientCancellationAllowed !== undefined
            ? { patientCancellationAllowed: input.patientCancellationAllowed }
            : {}),
          ...(input.patientCancellationHoursLimit !== undefined
            ? { patientCancellationHoursLimit: input.patientCancellationHoursLimit }
            : {}),
          ...(input.patientRescheduleAllowed !== undefined
            ? { patientRescheduleAllowed: input.patientRescheduleAllowed }
            : {}),
          ...(input.patientRescheduleHoursLimit !== undefined
            ? { patientRescheduleHoursLimit: input.patientRescheduleHoursLimit }
            : {})
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<OrganizationSettingsDocument>;
  }
}
