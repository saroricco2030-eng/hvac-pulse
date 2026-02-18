// ===================================================
// HVAC Pulse — Settings Module
// Preferences, data export/import, app info
// ===================================================

const Settings = (() => {

  const KEYS = {
    UNIT_TEMP:    'hvac-unit',
    UNIT_PRESS:   'hvac-pressure-unit',
    DEFAULT_REF:  'hvac-default-ref',
    METERING:     'hvac-metering'
  };

  const DEFAULTS = {
    [KEYS.UNIT_TEMP]:   'F',
    [KEYS.UNIT_PRESS]:  'psig',
    [KEYS.DEFAULT_REF]: 'R-410A',
    [KEYS.METERING]:    'txv'
  };

  // --- Get / Set ---
  function get(key) {
    return localStorage.getItem(key) || DEFAULTS[key] || '';
  }

  function set(key, value) {
    localStorage.setItem(key, value);
  }

  // --- Pressure conversion helpers ---
  function convertPressure(psig, toUnit) {
    const v = parseFloat(psig);
    if (isNaN(v)) return '--';
    if (toUnit === 'bar') return (v * 0.0689476 + 1.01325).toFixed(2);
    if (toUnit === 'kPa') return ((v + 14.696) * 6.89476).toFixed(1);
    return v; // psig
  }

  function pressureLabel() {
    const u = get(KEYS.UNIT_PRESS);
    if (u === 'bar') return 'bar(a)';
    if (u === 'kPa') return 'kPa(a)';
    return 'psig';
  }

  // --- Initialize UI ---
  function initUI() {
    renderAdditionalSettings();
    setupDataManagement();
  }

  function renderAdditionalSettings() {
    const container = document.getElementById('settings-extra');
    if (!container) return;

    const pressUnit = get(KEYS.UNIT_PRESS);
    const defaultRef = get(KEYS.DEFAULT_REF);
    const metering = get(KEYS.METERING);

    container.innerHTML = `
      <!-- Pressure Unit -->
      <div class="glass-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('settings.pressure_unit.title', '압력 단위')}</div>
            <div class="setting-desc">${t('settings.pressure_unit.desc', '표시 압력 단위 선택')}</div>
          </div>
          <div class="unit-toggle unit-toggle-3">
            <button class="${pressUnit === 'psig' ? 'active' : ''}" onclick="Settings.setPressUnit('psig')">psig</button>
            <button class="${pressUnit === 'bar' ? 'active' : ''}" onclick="Settings.setPressUnit('bar')">bar</button>
            <button class="${pressUnit === 'kPa' ? 'active' : ''}" onclick="Settings.setPressUnit('kPa')">kPa</button>
          </div>
        </div>
      </div>

      <!-- Default Refrigerant -->
      <div class="glass-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('settings.default_ref.title', '기본 냉매')}</div>
            <div class="setting-desc">${t('settings.default_ref.desc', '자주 사용하는 냉매를 기본값으로 설정')}</div>
          </div>
          <select id="setting-default-ref" class="form-select" style="width:auto;min-width:120px" onchange="Settings.setDefaultRef(this.value)">
            ${getRefrigerantList().map(k => `<option value="${k}" ${k === defaultRef ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Default Metering Device -->
      <div class="glass-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('settings.metering.title', '기본 계량장치')}</div>
            <div class="setting-desc">${t('settings.metering.desc', '과열도 정상 범위 기준')}</div>
          </div>
          <div class="unit-toggle">
            <button class="${metering === 'txv' ? 'active' : ''}" onclick="Settings.setMetering('txv')">TXV</button>
            <button class="${metering === 'orifice' ? 'active' : ''}" onclick="Settings.setMetering('orifice')">Orifice</button>
          </div>
        </div>
      </div>
    `;
  }

  function setPressUnit(unit) {
    set(KEYS.UNIT_PRESS, unit);
    renderAdditionalSettings();
  }

  function setDefaultRef(ref) {
    set(KEYS.DEFAULT_REF, ref);
  }

  function setMetering(type) {
    set(KEYS.METERING, type);
    renderAdditionalSettings();
  }

  // --- Data Management ---
  function setupDataManagement() {
    const container = document.getElementById('settings-data-mgmt');
    if (!container) return;

    container.innerHTML = `
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">${t('settings.data.title', '데이터 저장 현황')}</div>
          <div class="setting-desc" id="data-storage-info">${t('settings.data.loading', '확인 중...')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <button class="btn btn-primary" onclick="Settings.exportData()" style="font-size:var(--text-sm);padding:10px">
          📤 ${t('settings.export', '데이터 내보내기')}
        </button>
        <button class="btn" onclick="document.getElementById('import-file-input').click()" style="font-size:var(--text-sm);padding:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary)">
          📥 ${t('settings.import', '데이터 가져오기')}
        </button>
      </div>
      <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="Settings.importData(event)">
      <button class="btn" onclick="Settings.confirmDeleteAll()" style="width:100%;margin-top:8px;font-size:var(--text-sm);padding:10px;background:transparent;border:1px solid rgba(239,68,68,0.3);color:var(--accent-red)">
        🗑️ ${t('settings.delete_all', '전체 데이터 삭제')}
      </button>
    `;
  }

  // Export all IndexedDB data to JSON
  async function exportData() {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        appVersion: (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '1.0.0',
        serviceRecords: await DB.getAll(DB.STORES.SERVICE_RECORDS).catch(() => []),
        checklists: await DB.getAll(DB.STORES.CHECKLISTS).catch(() => []),
        fieldNotes: await DB.getAll(DB.STORES.FIELD_NOTES).catch(() => []),
        settings: {
          unit: get(KEYS.UNIT_TEMP),
          pressureUnit: get(KEYS.UNIT_PRESS),
          defaultRef: get(KEYS.DEFAULT_REF),
          metering: get(KEYS.METERING)
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hvac-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      App.showToast(t('toast.export_success', '데이터를 내보냈습니다.'), 'success');
    } catch (e) {
      console.error('Export failed:', e);
      App.showToast(t('toast.export_fail', '내보내기 실패'), 'error');
    }
  }

  // Import JSON data
  async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_IMPORT_SIZE) {
      App.showToast(t('toast.file_too_large', '파일이 너무 큽니다 (최대 10MB).'), 'error');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.appVersion || typeof data !== 'object' || Array.isArray(data)) {
        App.showToast(t('toast.invalid_backup', '유효하지 않은 백업 파일입니다.'), 'error');
        return;
      }

      let imported = 0;

      if (data.serviceRecords?.length) {
        for (const rec of data.serviceRecords) {
          await DB.put(DB.STORES.SERVICE_RECORDS, rec).catch(() => {});
        }
        imported += data.serviceRecords.length;
      }

      if (data.checklists?.length) {
        for (const rec of data.checklists) {
          await DB.put(DB.STORES.CHECKLISTS, rec).catch(() => {});
        }
        imported += data.checklists.length;
      }

      if (data.fieldNotes?.length) {
        for (const rec of data.fieldNotes) {
          await DB.put(DB.STORES.FIELD_NOTES, rec).catch(() => {});
        }
        imported += data.fieldNotes.length;
      }

      if (data.settings) {
        if (data.settings.unit) set(KEYS.UNIT_TEMP, data.settings.unit);
        if (data.settings.pressureUnit) set(KEYS.UNIT_PRESS, data.settings.pressureUnit);
        if (data.settings.defaultRef) set(KEYS.DEFAULT_REF, data.settings.defaultRef);
        if (data.settings.metering) set(KEYS.METERING, data.settings.metering);
      }

      App.showToast(t('toast.import_success', `${imported}건 데이터를 가져왔습니다.`), 'success');
      event.target.value = '';
    } catch (e) {
      console.error('Import failed:', e);
      App.showToast(t('toast.import_fail', '가져오기 실패 — 파일 형식을 확인하세요.'), 'error');
      event.target.value = '';
    }
  }

  function confirmDeleteAll() {
    if (!confirm(t('settings.confirm_delete1', '모든 수리기록, 체크리스트, 현장메모가 삭제됩니다.\n삭제하시겠습니까?'))) return;
    if (!confirm(t('settings.confirm_delete2', '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'))) return;

    deleteAllData();
  }

  async function deleteAllData() {
    try {
      await Promise.all([
        DB.clear(DB.STORES.SERVICE_RECORDS).catch(() => {}),
        DB.clear(DB.STORES.CHECKLISTS).catch(() => {}),
        DB.clear(DB.STORES.FIELD_NOTES).catch(() => {})
      ]);
      App.showToast(t('toast.delete_success', '모든 데이터가 삭제되었습니다.'), 'success');
    } catch (e) {
      console.error('Delete failed:', e);
      App.showToast(t('toast.delete_fail', '삭제 실패'), 'error');
    }
  }

  // --- Public API ---
  return {
    get, set, KEYS,
    convertPressure, pressureLabel,
    initUI,
    setPressUnit, setDefaultRef, setMetering,
    exportData, importData, confirmDeleteAll
  };
})();
