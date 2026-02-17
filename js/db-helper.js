// ===================================================
// HVAC Pulse — IndexedDB Helper
// Shared database module for all persistent storage
// DB: hvacr-service-db
// Stores: checklists, service-records, equipment, field-notes
// ===================================================

const DB = (() => {
  const DB_NAME = 'hvacr-service-db';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    CHECKLISTS: 'checklists',
    SERVICE_RECORDS: 'service-records',
    EQUIPMENT: 'equipment',
    FIELD_NOTES: 'field-notes'
  };

  // --- Open / Initialize DB ---
  function open() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        // Checklists store
        if (!database.objectStoreNames.contains(STORES.CHECKLISTS)) {
          const store = database.createObjectStore(STORES.CHECKLISTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('equipType', 'equipType', { unique: false });
        }

        // Service records store
        if (!database.objectStoreNames.contains(STORES.SERVICE_RECORDS)) {
          const store = database.createObjectStore(STORES.SERVICE_RECORDS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('siteName', 'siteName', { unique: false });
          store.createIndex('equipmentId', 'equipmentId', { unique: false });
        }

        // Equipment store
        if (!database.objectStoreNames.contains(STORES.EQUIPMENT)) {
          const store = database.createObjectStore(STORES.EQUIPMENT, { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: false });
        }

        // Field notes store
        if (!database.objectStoreNames.contains(STORES.FIELD_NOTES)) {
          const store = database.createObjectStore(STORES.FIELD_NOTES, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('tag', 'tag', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  // --- Generic CRUD ---
  async function add(storeName, data) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, data) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(storeName, id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(storeName) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(storeName, id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllByIndex(storeName, indexName, value) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function count(storeName) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return { open, add, put, get, getAll, remove, getAllByIndex, count, STORES };
})();
