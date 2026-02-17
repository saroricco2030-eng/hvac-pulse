// ===================================================
// HVAC Pulse — Cloud Sync Module
// Bidirectional IndexedDB ↔ Firestore sync
// Only active when Firebase is configured and user is logged in
// ===================================================

const CloudSync = (() => {

  let syncing = false;
  let lastSyncTime = 0;
  let lastSyncStatus = ''; // 'success' | 'error' | 'syncing' | ''

  // Map IndexedDB store names → Firestore subcollection names
  const COLLECTIONS = {
    'service-records': 'serviceRecords',
    'field-notes': 'fieldNotes',
    'checklists': 'checklists'
  };

  // =============================================
  // Helpers
  // =============================================
  function getFirestore() {
    if (!isFirebaseConfigured()) return null;
    return firebase.firestore();
  }

  function getUserRef() {
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    const db = getFirestore();
    if (!user || !db) return null;
    return db.collection('users').doc(user.uid);
  }

  function generateSyncId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // =============================================
  // Called when user logs in
  // =============================================
  function onLogin(user) {
    lastSyncTime = parseInt(localStorage.getItem('hvac-last-sync') || '0', 10);
    syncAll();
  }

  // =============================================
  // Full bidirectional sync (all stores)
  // =============================================
  async function syncAll() {
    if (syncing) return;
    const userRef = getUserRef();
    if (!userRef) return;

    syncing = true;
    lastSyncStatus = 'syncing';
    if (typeof Auth !== 'undefined') Auth.renderSection();

    try {
      for (const [storeName, collectionName] of Object.entries(COLLECTIONS)) {
        await syncStore(storeName, collectionName, userRef);
      }

      // Sync settings
      await syncSettings(userRef);

      lastSyncTime = Date.now();
      localStorage.setItem('hvac-last-sync', String(lastSyncTime));
      lastSyncStatus = 'success';
      App.showToast('클라우드 동기화 완료', 'success');
    } catch (err) {
      console.error('CloudSync: sync failed', err);
      lastSyncStatus = 'error';
      App.showToast('동기화 실패 — 나중에 다시 시도해주세요', 'error');
    } finally {
      syncing = false;
      if (typeof Auth !== 'undefined') Auth.renderSection();
    }
  }

  // =============================================
  // Sync a single IndexedDB store ↔ Firestore collection
  // =============================================
  async function syncStore(storeName, collectionName, userRef) {
    // 1) Get local records
    let localRecords = [];
    try {
      localRecords = await DB.getAll(storeName);
    } catch (e) {
      return;
    }

    // 2) Ensure every local record has syncId + updatedAt
    for (const rec of localRecords) {
      let needsUpdate = false;
      if (!rec.syncId) {
        rec.syncId = generateSyncId();
        needsUpdate = true;
      }
      if (!rec.updatedAt) {
        rec.updatedAt = rec.date || new Date().toISOString();
        needsUpdate = true;
      }
      if (needsUpdate) {
        await DB.put(storeName, rec);
      }
    }

    // 3) Get cloud records
    const cloudRef = userRef.collection(collectionName);
    const snapshot = await cloudRef.get();
    const cloudMap = {};
    snapshot.forEach(doc => {
      cloudMap[doc.id] = doc.data();
    });

    // 4) Build local map by syncId
    const localMap = {};
    localRecords.forEach(rec => {
      if (rec.syncId) localMap[rec.syncId] = rec;
    });

    // 5) Push local → cloud (batch write for efficiency)
    const fsDb = getFirestore();
    let batch = fsDb.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 450; // Firestore limit is 500

    for (const rec of localRecords) {
      if (!rec.syncId) continue;
      const cloudRec = cloudMap[rec.syncId];

      if (!cloudRec) {
        // New local record → push to cloud
        batch.set(cloudRef.doc(rec.syncId), sanitizeForCloud(rec));
        batchCount++;
      } else {
        // Exists in both → local wins if newer
        const localTime = new Date(rec.updatedAt || rec.date || 0).getTime();
        const cloudTime = cloudRec.updatedAt ? new Date(cloudRec.updatedAt).getTime() : 0;

        if (localTime > cloudTime) {
          batch.set(cloudRef.doc(rec.syncId), sanitizeForCloud(rec));
          batchCount++;
        }
      }

      // Commit batch if near limit
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = fsDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // 6) Pull cloud → local (cloud wins if newer, insert if missing)
    for (const [syncId, cloudRec] of Object.entries(cloudMap)) {
      const localRec = localMap[syncId];

      if (!localRec) {
        // New cloud record → insert locally
        const newRec = { ...cloudRec, syncId };
        delete newRec.id; // Let IndexedDB auto-increment
        await DB.add(storeName, newRec);
      } else {
        // Exists in both → cloud wins if newer
        const localTime = new Date(localRec.updatedAt || localRec.date || 0).getTime();
        const cloudTime = cloudRec.updatedAt ? new Date(cloudRec.updatedAt).getTime() : 0;

        if (cloudTime > localTime) {
          const updatedRec = { ...cloudRec, id: localRec.id, syncId };
          await DB.put(storeName, updatedRec);
        }
      }
    }
  }

  // =============================================
  // Sanitize record for Firestore
  // =============================================
  function sanitizeForCloud(rec) {
    const clean = { ...rec };
    delete clean.id; // IndexedDB auto-increment ID — not needed in cloud

    // Strip base64 photos (too large for Firestore 1MB doc limit)
    if (clean.photos && clean.photos.length > 0) {
      clean.hasPhotos = true;
      clean.photoCount = clean.photos.length;
      delete clean.photos;
    }

    return clean;
  }

  // =============================================
  // Sync settings (localStorage ↔ Firestore)
  // =============================================
  async function syncSettings(userRef) {
    const settingsRef = userRef.collection('settings').doc('preferences');
    const doc = await settingsRef.get();
    const cloudSettings = doc.exists ? doc.data() : null;

    const localUpdated = localStorage.getItem('hvac-settings-updated') || new Date(0).toISOString();
    const localSettings = {
      unit: localStorage.getItem('hvac-unit') || 'F',
      pressureUnit: localStorage.getItem('hvac-pressure-unit') || 'psig',
      defaultRef: localStorage.getItem('hvac-default-ref') || 'R-410A',
      metering: localStorage.getItem('hvac-metering') || 'txv',
      updatedAt: localUpdated
    };

    if (!cloudSettings) {
      // First sync — push local settings to cloud
      localSettings.updatedAt = new Date().toISOString();
      await settingsRef.set(localSettings);
      localStorage.setItem('hvac-settings-updated', localSettings.updatedAt);
    } else {
      const localTime = new Date(localUpdated).getTime();
      const cloudTime = new Date(cloudSettings.updatedAt || 0).getTime();

      if (localTime > cloudTime) {
        // Push local → cloud
        localSettings.updatedAt = new Date().toISOString();
        await settingsRef.set(localSettings);
        localStorage.setItem('hvac-settings-updated', localSettings.updatedAt);
      } else if (cloudTime > localTime) {
        // Pull cloud → local
        if (cloudSettings.unit) localStorage.setItem('hvac-unit', cloudSettings.unit);
        if (cloudSettings.pressureUnit) localStorage.setItem('hvac-pressure-unit', cloudSettings.pressureUnit);
        if (cloudSettings.defaultRef) localStorage.setItem('hvac-default-ref', cloudSettings.defaultRef);
        if (cloudSettings.metering) localStorage.setItem('hvac-metering', cloudSettings.metering);
        localStorage.setItem('hvac-settings-updated', cloudSettings.updatedAt);
      }
    }
  }

  // =============================================
  // Single record push (called after local save)
  // =============================================
  async function pushRecord(storeName, record) {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    if (!isFirebaseConfigured()) return;

    const userRef = getUserRef();
    if (!userRef) return;

    const collectionName = COLLECTIONS[storeName];
    if (!collectionName) return;

    // Ensure syncId
    if (!record.syncId) {
      record.syncId = generateSyncId();
      record.updatedAt = new Date().toISOString();
      await DB.put(storeName, record);
    } else {
      record.updatedAt = new Date().toISOString();
      await DB.put(storeName, record);
    }

    try {
      const clean = sanitizeForCloud(record);
      await userRef.collection(collectionName).doc(record.syncId).set(clean);
    } catch (err) {
      console.warn('CloudSync: single record push failed', err);
    }
  }

  // =============================================
  // Single record delete from cloud
  // =============================================
  async function deleteRecord(storeName, syncId) {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    if (!isFirebaseConfigured() || !syncId) return;

    const userRef = getUserRef();
    if (!userRef) return;

    const collectionName = COLLECTIONS[storeName];
    if (!collectionName) return;

    try {
      await userRef.collection(collectionName).doc(syncId).delete();
    } catch (err) {
      console.warn('CloudSync: delete from cloud failed', err);
    }
  }

  // =============================================
  // Status text (for UI display)
  // =============================================
  function getStatusText() {
    if (lastSyncStatus === 'syncing') return '동기화 중...';
    if (lastSyncStatus === 'error') return '동기화 실패';
    if (lastSyncTime) {
      const diff = Date.now() - lastSyncTime;
      if (diff < 60000) return '방금 동기화됨';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전 동기화`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전 동기화`;
      return `${Math.floor(diff / 86400000)}일 전 동기화`;
    }
    return '';
  }

  // =============================================
  // Public API
  // =============================================
  return {
    onLogin, syncAll, pushRecord, deleteRecord, getStatusText
  };
})();
