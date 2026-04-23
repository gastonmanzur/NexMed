const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    return window.location.origin;
  }

  if (ABSOLUTE_URL_REGEX.test(apiUrl)) {
    return new URL(apiUrl).origin;
  }

  return window.location.origin;
};

export const resolveAvatarUrl = (avatarUrl: string): string => {
  if (ABSOLUTE_URL_REGEX.test(avatarUrl)) {
    return avatarUrl;
  }

  return new URL(avatarUrl, getBackendBaseUrl()).toString();
};
