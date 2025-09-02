const base = import.meta.env.VITE_API_URL || '/api';
export const API_URL = new URL(base, window.location.origin).toString();
