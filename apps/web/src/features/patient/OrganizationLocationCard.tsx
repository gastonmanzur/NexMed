import type { ReactElement } from 'react';
import type { OrganizationDto } from '@starter/shared-types';

const hasValidCoordinates = (organization: OrganizationDto): boolean =>
  typeof organization.latitude === 'number' &&
  Number.isFinite(organization.latitude) &&
  organization.latitude >= -90 &&
  organization.latitude <= 90 &&
  typeof organization.longitude === 'number' &&
  Number.isFinite(organization.longitude) &&
  organization.longitude >= -180 &&
  organization.longitude <= 180;

export const getOrganizationAddressText = (organization: OrganizationDto): string =>
  [organization.address, organization.city, organization.province, organization.postalCode, organization.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ');

export const getGoogleMapsDirectionsUrl = (organization: OrganizationDto): string | null => {
  if (!organization.locationPublic) {
    return null;
  }

  if (hasValidCoordinates(organization)) {
    return `https://www.google.com/maps/search/?api=1&query=${organization.latitude},${organization.longitude}`;
  }

  const address = getOrganizationAddressText(organization);
  if (!address) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

export const canShowOrganizationLocation = (organization: OrganizationDto | null | undefined): organization is OrganizationDto =>
  Boolean(organization && getGoogleMapsDirectionsUrl(organization));

interface OrganizationLocationCardProps {
  organization: OrganizationDto | null | undefined;
  compact?: boolean;
}

export const OrganizationLocationCard = ({ organization, compact = false }: OrganizationLocationCardProps): ReactElement | null => {
  if (!canShowOrganizationLocation(organization)) {
    return null;
  }

  const address = getOrganizationAddressText(organization);
  const mapsUrl = getGoogleMapsDirectionsUrl(organization);

  if (!mapsUrl) {
    return null;
  }

  return (
    <section className={`nx-location-card${compact ? ' nx-location-card--compact' : ''}`} aria-label="Ubicación del centro">
      <div className="nx-location-card__icon" aria-hidden="true">📍</div>
      <div className="nx-location-card__body">
        <p className="nx-location-card__eyebrow">Ubicación del centro</p>
        <h3>{organization.displayName ?? organization.name}</h3>
        {address ? <p className="nx-location-card__address">{address}</p> : null}
        {organization.locationLabel ? <p className="nx-location-card__label">{organization.locationLabel}</p> : null}
      </div>
      <a className="nx-btn nx-location-card__button" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        Cómo llegar
      </a>
    </section>
  );
};
