export interface HistoryRecord {
  id: number;
  type: 'crop' | 'health';
  createdAt: string;
  title: string;
  detail: string;
  advice: string;
  confidence: number;
  imagePath?: string;
}

const STORAGE_KEY = 'smartvillage.history.records';

export const historyService = {
  list(): HistoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  insert(record: Omit<HistoryRecord, 'id'>): HistoryRecord {
    const records = this.list();
    const newRecord: HistoryRecord = {
      ...record,
      id: Date.now(),
    };
    const updated = [newRecord, ...records];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
    } catch {
      // If quota exceeded, trim images
      const trimmed = updated.slice(0, 30).map((r) => ({
        ...r,
        imagePath: r.imagePath?.startsWith('data:') ? undefined : r.imagePath,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
    return newRecord;
  },

  delete(id: number): void {
    const records = this.list().filter((r) => r.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {}
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
};
