import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string>();

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage.get(key) || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[storage] Error reading key ${key}:`, e);
      return memoryStorage.get(key) || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryStorage.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[storage] Error writing key ${key}:`, e);
      memoryStorage.set(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        memoryStorage.delete(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[storage] Error deleting key ${key}:`, e);
      memoryStorage.delete(key);
    }
  },
};
