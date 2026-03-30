import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  iconUri?: string;
  iconSourceUrl?: string;
  iconType?: 'image' | 'lucide'; // Type of icon: image URI or Lucide icon name
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  group?: string;
  accentColor?: string;
}

const STORAGE_KEY = '@blurb:entries';

/**
 * Queue to prevent race conditions on concurrent storage operations
 */
class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.queue.then(operation, operation);
    this.queue = promise.catch(() => {}); // Prevent unhandled rejections from blocking queue
    return promise;
  }
}

const storageQueue = new StorageQueue();

export const storage = {
  async getAllEntries(): Promise<Entry[]> {
    return storageQueue.enqueue(async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
      } catch (error) {
        console.error('Error loading entries:', error);
        return [];
      }
    });
  },

  async getEntry(id: string): Promise<Entry | null> {
    const entries = await storage.getAllEntries();
    return entries.find((e) => e.id === id) || null;
  },

  async saveEntry(entry: Entry): Promise<void> {
    return storageQueue.enqueue(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: Entry[] = data ? JSON.parse(data) : [];
      const index = entries.findIndex((e) => e.id === entry.id);

      if (index >= 0) {
        entries[index] = { ...entry, updatedAt: Date.now() };
      } else {
        entries.push({ ...entry, createdAt: Date.now(), updatedAt: Date.now() });
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    });
  },

  async deleteEntry(id: string): Promise<void> {
    return storageQueue.enqueue(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: Entry[] = data ? JSON.parse(data) : [];
      const filtered = entries.filter((e) => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    });
  },

  async duplicateEntry(id: string): Promise<Entry | null> {
    const entry = await storage.getEntry(id);
    if (!entry) return null;

    const duplicated: Entry = {
      ...entry,
      id: Crypto.randomUUID(),
      title: `${entry.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveEntry(duplicated);
    return duplicated;
  },
};
