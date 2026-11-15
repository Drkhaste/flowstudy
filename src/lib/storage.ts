import type { StoredDocument } from './types';

const DB_NAME = 'studyflow-local';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const DOCUMENT_KEY = 'pen-lab-v1';
const FALLBACK_KEY = 'studyflow:pen-lab:v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('مرورگر از IndexedDB پشتیبانی نمی‌کند.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('باز کردن پایگاه داده ناموفق بود.'));
    request.onblocked = () => reject(new Error('پایگاه داده توسط تب دیگری قفل شده است.'));
  });
}

export async function loadDocument(): Promise<StoredDocument | null> {
  try {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DOCUMENT_KEY);
        request.onsuccess = () => resolve((request.result as StoredDocument | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('خواندن اطلاعات ناموفق بود.'));
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn('IndexedDB read failed; trying localStorage fallback.', error);
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? (JSON.parse(raw) as StoredDocument) : null;
    } catch (fallbackError) {
      console.error('Local storage fallback failed.', fallbackError);
      return null;
    }
  }
}

export async function saveDocument(document: StoredDocument): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(document, DOCUMENT_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('ذخیره اطلاعات ناموفق بود.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('عملیات ذخیره لغو شد.'));
      });
      return;
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn('IndexedDB write failed; trying localStorage fallback.', error);
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(document));
    } catch (fallbackError) {
      console.error('Local storage fallback failed.', fallbackError);
      throw new Error('ذخیره‌سازی محلی در دسترس نیست یا فضای کافی ندارد.');
    }
  }
}

export async function deleteDocument(): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(DOCUMENT_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('پاک کردن اطلاعات ناموفق بود.'));
      });
    } finally {
      db.close();
    }
  } finally {
    try {
      localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // The primary IndexedDB record is already removed.
    }
  }
}
