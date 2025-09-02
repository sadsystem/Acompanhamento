// This file is deprecated - functionality moved to storageNeon.ts
// Remove this file to avoid confusion and use storageNeon.ts instead

console.warn('supabaseStorage.ts is deprecated. Use storageNeon.ts instead.');

// Re-export new storage for backward compatibility
export { storageNeon as SupabaseStorage } from './storageNeon';
