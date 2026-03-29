export const JOIN_INTENT_STORAGE_KEY = 'nexmed.patient.joinIntent';
export const saveJoinIntent = (tokenOrSlug: string): void => localStorage.setItem(JOIN_INTENT_STORAGE_KEY, tokenOrSlug);
export const readJoinIntent = (): string | null => localStorage.getItem(JOIN_INTENT_STORAGE_KEY);
export const clearJoinIntent = (): void => localStorage.removeItem(JOIN_INTENT_STORAGE_KEY);
