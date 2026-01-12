import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  iconUri?: string;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  group?: string;
  accentColor?: string;
}

const STORAGE_KEY = '@blurb:entries';

export const storage = {
  async getAllEntries(): Promise<Entry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading entries:', error);
      return [];
    }
  },

  async getEntry(id: string): Promise<Entry | null> {
    const entries = await storage.getAllEntries();
    return entries.find((e) => e.id === id) || null;
  },

  async saveEntry(entry: Entry): Promise<void> {
    const entries = await storage.getAllEntries();
    const index = entries.findIndex((e) => e.id === entry.id);
    
    if (index >= 0) {
      entries[index] = { ...entry, updatedAt: Date.now() };
    } else {
      entries.push({ ...entry, createdAt: Date.now(), updatedAt: Date.now() });
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  },

  async deleteEntry(id: string): Promise<void> {
    const entries = await storage.getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  async duplicateEntry(id: string): Promise<Entry | null> {
    const entry = await storage.getEntry(id);
    if (!entry) return null;

    const duplicated: Entry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${entry.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveEntry(duplicated);
    return duplicated;
  },
};
