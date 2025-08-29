import { useContext } from 'react';
import { StorageContext } from '../context/StorageContext';

export function useStorage() {
  const adapter = useContext(StorageContext);
  if (!adapter) {
    throw new Error('useStorage must be used within StorageProvider');
  }
  return adapter;
}
