// ===================================================
// HVAC Pulse — Service History
// Record, search, and manage service/repair records
// ===================================================

const ServiceHistory = (() => {

  const SYMPTOM_OPTIONS = [
    '냉각불량', '이상소음', '기동불가', '결빙', '누설',
    '에러코드', '고압경보', '저압경보', '진동과다', '기타'
  ];

  let currentView = 'list'; // 'list' | 'form' | 'detail'
  let editingId = null;
  let photosArray = []; // base64 strings for current form

  function initUI() {
    renderList();
  }

  // --- List view ---
  async function renderList() {
    const container = document.getElementById('service-content');
    if (!container) return;
    currentView = 'list';

    let records = [];
    try { records = await DB.getAll(DB.STORES.SERVICE_RECORDS); } catch (e) {}
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      <div class="page-header">
        <h1>📝 ${t('service.title', '수리이력')}</h1>
        <p class="subtitle">${t('service.subtitle', '현장 수리 내용 기록 및 관리')}</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" id="sh-search" class="form-input" placeholder="${t('service.search_placeholder', '검색 (현장명, 모델명, 증상...)')}"
          style="flex:1;min-height:40px;font-family:var(--font-sans);font-size:var(--text-sm)"
          oninput="ServiceHistory.filterList()">
      </div>

      <button class="btn btn-primary" style="margin-bottom:16px" onclick="ServiceHistory.showForm()">
        + ${t('service.new_record', '새 기록 작성')}
      </button>

      <div id="sh-list-area">
        ${records.length === 0 ? `
          <div class="glass-card" style="text-align:center;padding:40px 24px">
            <span style="font-size:var(--text-3xl)">📝</span>
            <p style="color:var(--text-secondary);margin-top:12px">${t('service.no_records', '수리 기록이 없습니다.')}</p>
          </div>
        ` : records.map(r => renderRecordCard(r)).join('')}
      </div>`;
  }

  function renderRecordCard(r) {
    const d = new Date(r.date);
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return `
      <div class="glass-card" style="padding:16px;cursor:pointer" onclick="ServiceHistory.showDetail(${r.id})" data-search="${(r.siteName || '') + ' ' + (r.modelName || '') + ' ' + (r.symptom || '')}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:var(--text-base);font-weight:600">${r.siteName || t('service.no_site', '(현장명 없음)')}</div>
          <span style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono);white-space:nowrap">${dateStr}</span>
        </div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:4px">
          ${r.manufacturer || ''} ${r.modelName || ''} ${r.equipType ? `(${r.equipType})` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${r.symptom ? `<span class="badge badge-caution">${r.symptom}</span>` : ''}
          ${r.errorCode ? `<span class="badge badge-danger">E: ${r.errorCode}</span>` : ''}
          ${r.photos && r.photos.length > 0 ? `<span class="badge badge-normal">📷 ${r.photos.length}</span>` : ''}
        </div>
      </div>`;
  }

  function filterList() {
    const query = (document.getElementById('sh-search')?.value || '').toLowerCase();
    document.querySelectorAll('#sh-list-area .glass-card').forEach(card => {
      const searchText = (card.dataset.search || '').toLowerCase();
      card.style.display = searchText.includes(query) ? 'block' : 'none';
    });
  }

  // --- Form view ---
  function showForm(id) {
    currentView = 'form';
    editingId = id || null;
    photosArray = [];

    if (id) {
      DB.get(DB.STORES.SERVICE_RECORDS, id).then(record => {
        if (record) {
          photosArray = record.photos || [];
          renderForm(record);
        }
      });
    } else {
      // Check for diagnostic prefill data
      const prefill = window._diagPrefillData || null;
      renderForm(null, prefill);
      if (prefill) window._diagPrefillData = null;
    }
  }

  function renderForm(existing, prefill) {
    const container = document.getElementById('service-content');
    if (!container) return;

    const now = existing ? new Date(existing.date) : new Date();
    const dateVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Apply diagnostic prefill data (from DataBridge.saveDiagToServiceRecord)
    const pf = prefill || {};

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="ServiceHistory.renderList()" style="width:auto;padding:8px 12px">← ${t('common.list', '목록')}</button>
        <h2 style="font-size:var(--text-lg);font-weight:700">${existing ? t('service.edit_record', '기록 수정') : t('service.new_record', '새 수리 기록')}</h2>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.basic_info', '기본 정보')}</div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">${t('service.date', '날짜')}</label>
            <input type="date" id="sh-date" class="form-input" value="${dateVal}" style="font-family:var(--font-sans)">
          </div>
          <div class="form-group">
            <label class="form-label">${t('service.time', '시간')}</label>
            <input type="time" id="sh-time" class="form-input" value="${timeVal}" style="font-family:var(--font-sans)">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('service.site_name', '현장명/위치')}</label>
          <input type="text" id="sh-site" class="form-input" placeholder="${t('service.site_placeholder', '예: OO빌딩 B1 기계실')}" value="${existing?.siteName || ''}" style="font-family:var(--font-sans)">
        </div>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.equip_info', '장비 정보')}</div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">${t('service.manufacturer', '제조사')}</label>
            <input type="text" id="sh-mfr" class="form-input" placeholder="${t('service.mfr_placeholder', '예: Carrier')}" value="${existing?.manufacturer || ''}" style="font-family:var(--font-sans)">
          </div>
          <div class="form-group">
            <label class="form-label">${t('service.model', '모델명')}</label>
            <input type="text" id="sh-model" class="form-input" placeholder="${t('service.model_placeholder', '예: 30RB-080')}" value="${existing?.modelName || ''}" style="font-family:var(--font-sans)">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('service.equip_type', '장비유형')}</label>
          <select id="sh-equip-type" class="form-select" style="font-family:var(--font-sans)">
            <option value="">${t('common.select', '선택...')}</option>
            <option value="냉동기" ${existing?.equipType === '냉동기' ? 'selected' : ''}>냉동기</option>
            <option value="칠러" ${existing?.equipType === '칠러' ? 'selected' : ''}>칠러</option>
            <option value="VRF" ${existing?.equipType === 'VRF' ? 'selected' : ''}>VRF</option>
            <option value="패키지/RTU" ${existing?.equipType === '패키지/RTU' ? 'selected' : ''}>패키지/RTU</option>
            <option value="쇼케이스" ${existing?.equipType === '쇼케이스' ? 'selected' : ''}>쇼케이스</option>
            <option value="항온항습기" ${existing?.equipType === '항온항습기' ? 'selected' : ''}>항온항습기</option>
            <option value="기타" ${existing?.equipType === '기타' ? 'selected' : ''}>기타</option>
          </select>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.symptom_diag', '증상/진단')}</div>
        <div class="form-group">
          <label class="form-label">${t('service.symptom', '증상')}</label>
          <select id="sh-symptom" class="form-select" style="font-family:var(--font-sans)">
            <option value="">${t('common.select', '선택...')}</option>
            ${SYMPTOM_OPTIONS.map(s => `<option value="${s}" ${existing?.symptom === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('service.error_code', '에러코드 (있으면)')}</label>
          <input type="text" id="sh-error" class="form-input" placeholder="${t('service.error_placeholder', '예: E-03')}" value="${existing?.errorCode || ''}" style="font-family:var(--font-sans)">
        </div>
        ${pf.symptom ? `
        <div class="prefill-indicator">
          <div class="prefill-label">${t('service.prefill_label', '진단 측정값 (자동 입력)')}</div>
          <div class="prefill-values">${pf.symptom}</div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">${t('service.diagnosis_result', '진단 결과')}</label>
          <textarea id="sh-diagnosis" class="form-input" rows="3" placeholder="${t('service.diagnosis_placeholder', '진단 내용...')}" style="font-family:var(--font-sans);resize:vertical;height:auto">${existing?.diagnosis || pf.diagnosis || ''}</textarea>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.repair_content', '수리 내용')}</div>
        <div class="form-group">
          <label class="form-label">${t('service.repair_content', '수리 내용')}</label>
          <textarea id="sh-repair" class="form-input" rows="3" placeholder="${t('service.repair_placeholder', '수리/조치 내용...')}" style="font-family:var(--font-sans);resize:vertical;height:auto">${existing?.repairContent || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('service.replaced_parts', '교체 부품')}</label>
          <textarea id="sh-parts" class="form-input" rows="2" placeholder="${t('service.parts_placeholder', '부품명, 수량 (한 줄에 하나씩)')}" style="font-family:var(--font-sans);resize:vertical;height:auto">${existing?.replacedParts || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('service.tech_memo', '기술자 메모')}</label>
          <textarea id="sh-memo" class="form-input" rows="2" placeholder="${t('service.memo_placeholder', '추가 메모...')}" style="font-family:var(--font-sans);resize:vertical;height:auto">${existing?.techMemo || pf.techMemo || ''}</textarea>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.photos', '사진 첨부')}</div>
        <div id="sh-photo-preview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${photosArray.map((p, i) => `
            <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
              <img src="${p}" style="width:100%;height:100%;object-fit:cover">
              <button onclick="ServiceHistory.removePhoto(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:var(--text-xs)">×</button>
            </div>
          `).join('')}
        </div>
        <input type="file" id="sh-photo-input" accept="image/*" capture="environment" style="display:none" onchange="ServiceHistory.handlePhoto(event)">
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('sh-photo-input').click()" style="width:auto">
          📷 ${t('service.add_photo', '사진 추가')}
        </button>
      </div>

      <button class="btn btn-success" onclick="ServiceHistory.saveRecord()">
        💾 ${existing ? t('service.save_edit', '수정 저장') : t('service.save_record', '기록 저장')}
      </button>
      <div style="height:24px"></div>`;
  }

  function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // Resize if too large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        photosArray.push(dataUrl);
        updatePhotoPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function removePhoto(index) {
    photosArray.splice(index, 1);
    updatePhotoPreview();
  }

  function updatePhotoPreview() {
    const el = document.getElementById('sh-photo-preview');
    if (!el) return;
    el.innerHTML = photosArray.map((p, i) => `
      <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <img src="${p}" style="width:100%;height:100%;object-fit:cover">
        <button onclick="ServiceHistory.removePhoto(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:var(--text-xs)">×</button>
      </div>
    `).join('');
  }

  async function saveRecord() {
    const dateStr = document.getElementById('sh-date')?.value;
    const timeStr = document.getElementById('sh-time')?.value;
    const dateVal = dateStr && timeStr ? new Date(`${dateStr}T${timeStr}`).toISOString() : new Date().toISOString();

    const record = {
      date: dateVal,
      siteName: document.getElementById('sh-site')?.value || '',
      manufacturer: document.getElementById('sh-mfr')?.value || '',
      modelName: document.getElementById('sh-model')?.value || '',
      equipType: document.getElementById('sh-equip-type')?.value || '',
      symptom: document.getElementById('sh-symptom')?.value || '',
      errorCode: document.getElementById('sh-error')?.value || '',
      diagnosis: document.getElementById('sh-diagnosis')?.value || '',
      repairContent: document.getElementById('sh-repair')?.value || '',
      replacedParts: document.getElementById('sh-parts')?.value || '',
      techMemo: document.getElementById('sh-memo')?.value || '',
      photos: photosArray
    };

    try {
      if (editingId) {
        record.id = editingId;
        record.updatedAt = new Date().toISOString();
        await DB.put(DB.STORES.SERVICE_RECORDS, record);
      } else {
        record.updatedAt = new Date().toISOString();
        const newId = await DB.add(DB.STORES.SERVICE_RECORDS, record);
        record.id = newId;
      }

      // Cloud sync (non-blocking)
      if (typeof CloudSync !== 'undefined') {
        CloudSync.pushRecord(DB.STORES.SERVICE_RECORDS, record).catch(() => {});
      }

      alert(t('toast.saved', '저장되었습니다.'));
      editingId = null;
      photosArray = [];
      renderList();
    } catch (err) {
      alert(t('toast.save_fail', '저장 실패') + ': ' + err.message);
    }
  }

  // --- Detail view ---
  async function showDetail(id) {
    const container = document.getElementById('service-content');
    if (!container) return;

    const r = await DB.get(DB.STORES.SERVICE_RECORDS, id);
    if (!r) return;

    const d = new Date(r.date);
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="ServiceHistory.renderList()" style="width:auto;padding:8px 12px">← ${t('common.list', '목록')}</button>
        <h2 style="font-size:var(--text-lg);font-weight:700">${t('service.detail_title', '수리 기록 상세')}</h2>
      </div>

      <div class="glass-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:var(--text-base);font-weight:700">${r.siteName || t('service.no_site', '(현장명 없음)')}</span>
          <span style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">${dateStr}</span>
        </div>

        ${r.manufacturer || r.modelName ? `
          <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:8px">
            ${r.manufacturer || ''} ${r.modelName || ''} ${r.equipType ? `(${r.equipType})` : ''}
          </div>` : ''}

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
          ${r.symptom ? `<span class="badge badge-caution">${r.symptom}</span>` : ''}
          ${r.errorCode ? `<span class="badge badge-danger">E: ${r.errorCode}</span>` : ''}
        </div>

        ${r.diagnosis ? `<div style="margin-bottom:12px"><div class="form-label">${t('service.diagnosis_result', '진단 결과')}</div><div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-primary)">${r.diagnosis}</div></div>` : ''}
        ${r.repairContent ? `<div style="margin-bottom:12px"><div class="form-label">${t('service.repair_content', '수리 내용')}</div><div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-primary)">${r.repairContent}</div></div>` : ''}
        ${r.replacedParts ? `<div style="margin-bottom:12px"><div class="form-label">${t('service.replaced_parts', '교체 부품')}</div><div style="font-size:var(--text-sm);line-height:1.7;color:var(--text-primary);white-space:pre-line">${r.replacedParts}</div></div>` : ''}
        ${r.techMemo ? `<div style="margin-bottom:12px"><div class="form-label">${t('service.tech_memo', '기술자 메모')}</div><div style="font-size:var(--text-sm);line-height:1.7;color:var(--accent-cyan)">${r.techMemo}</div></div>` : ''}

        ${r.photos && r.photos.length > 0 ? `
          <div class="form-label">${t('service.photos', '사진')} (${r.photos.length})</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${r.photos.map(p => `
              <div style="width:100px;height:100px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
                <img src="${p}" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onclick="window.open(this.src)">
              </div>
            `).join('')}
          </div>` : ''}
      </div>

      <div class="btn-group" style="margin-top:12px">
        <button class="btn btn-sm btn-outline" onclick="ServiceHistory.showForm(${r.id})">${t('common.edit', '수정')}</button>
        <button class="btn btn-sm btn-danger" onclick="ServiceHistory.deleteRecord(${r.id})">${t('common.delete', '삭제')}</button>
      </div>
      <div style="height:24px"></div>`;
  }

  async function deleteRecord(id) {
    if (!confirm(t('service.confirm_delete', '이 기록을 삭제하시겠습니까?'))) return;

    // Get syncId before deleting (for cloud sync)
    let syncId = null;
    try {
      const rec = await DB.get(DB.STORES.SERVICE_RECORDS, id);
      syncId = rec?.syncId;
    } catch (e) {}

    await DB.remove(DB.STORES.SERVICE_RECORDS, id);

    // Delete from cloud (non-blocking)
    if (syncId && typeof CloudSync !== 'undefined') {
      CloudSync.deleteRecord(DB.STORES.SERVICE_RECORDS, syncId).catch(() => {});
    }

    renderList();
  }

  return { initUI, renderList, showForm, showDetail, saveRecord, deleteRecord, handlePhoto, removePhoto, filterList };
})();
