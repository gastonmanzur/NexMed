const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    return window.location.origin;
  }

  return new URL(apiUrl).origin;
};

export const resolveAvatarUrl = (avatarUrl: string): string => {
  if (ABSOLUTE_URL_REGEX.test(avatarUrl)) {
    return avatarUrl;
  }

  return new URL(avatarUrl, getBackendBaseUrl()).toString();
};
