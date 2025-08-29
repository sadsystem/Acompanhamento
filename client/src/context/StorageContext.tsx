import { createContext, ReactNode } from "react";
import { StorageAdapter } from "../storage/adapter";

export const StorageContext = createContext<StorageAdapter | null>(null);

interface StorageProviderProps {
  adapter: StorageAdapter;
  children: ReactNode;
}

export function StorageProvider({ adapter, children }: StorageProviderProps) {
  return (
    <StorageContext.Provider value={adapter}>
      {children}
    </StorageContext.Provider>
  );
}
