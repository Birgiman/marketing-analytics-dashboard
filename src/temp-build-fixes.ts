// Temporary file to patch critical build issues
// This file provides temporary workarounds for TypeScript build errors

export const BUILD_FIXES_ENABLED = true;

// Patch for unknown error types
export function handleUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Patch for unknown data types  
export function safeAccess<T>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === 'object' && key in obj) {
    return (obj as any)[key];
  }
  return undefined;
}

// Patch for array operations
export function safeReduce<T, R>(arr: unknown, fn: (acc: R, item: T, index: number) => R, initial: R): R {
  if (!Array.isArray(arr)) return initial;
  return arr.reduce(fn, initial);
}

// Patch for campaign creatives
export function safeCampaignData(data: unknown) {
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    impressions: item?.impressions || 0,
    amount_spent: item?.amount_spent || 0,
    clicks: item?.clicks || 0,
    ...item
  }));
}