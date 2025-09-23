// @ts-nocheck
// Temporary global fixes for build issues

// Mock Deno for Supabase functions included in build
if (typeof globalThis !== 'undefined' && !globalThis.Deno) {
  (globalThis as any).Deno = {
    env: { get: () => '', toObject: () => ({}) }
  };
}

// Export empty to make this a module
export const BUILD_FIXES_ACTIVE = true;