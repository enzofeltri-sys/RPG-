import { Character, ensureCharacterDefaults } from '../game/character';

const DB_NAME = 'vaeloria-save';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SLOT_KEY = 'slot-1';

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  character?: Character;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class SaveManager {
  static async hasSave(): Promise<boolean> {
    const data = await SaveManager.load();
    return data !== undefined;
  }

  static async load(): Promise<SaveData | undefined> {
    const db = await openDatabase();
    const data = await new Promise<SaveData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(SLOT_KEY);
      request.onsuccess = () => resolve(request.result as SaveData | undefined);
      request.onerror = () => reject(request.error);
    });
    if (data?.character) {
      ensureCharacterDefaults(data.character);
    }
    return data;
  }

  static async save(data: SaveData): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, SLOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async createNewGame(): Promise<SaveData> {
    const now = Date.now();
    const data: SaveData = { version: 1, createdAt: now, updatedAt: now };
    await SaveManager.save(data);
    return data;
  }

  static async saveCharacter(character: Character): Promise<void> {
    const now = Date.now();
    const existing = await SaveManager.load();
    const data: SaveData = existing ?? { version: 1, createdAt: now, updatedAt: now };
    data.character = character;
    data.updatedAt = now;
    await SaveManager.save(data);
  }
}
