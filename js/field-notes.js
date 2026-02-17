// ===================================================
// HVAC Pulse — Field Notes
// Quick memos with photos, tags, IndexedDB storage
// ===================================================

const FieldNotes = (() => {

  const TAG_OPTIONS = [
    { id: 'issue', label: '문제점', color: 'var(--accent-red)' },
    { id: 'solution', label: '해결', color: 'var(--accent-green)' },
    { id: 'tip', label: '팁', color: 'var(--accent-cyan)' },
    { id: 'measurement', label: '측정값', color: 'var(--accent-blue)' },
    { id: 'part', label: '부품', color: 'var(--accent-orange)' },
    { id: 'followup', label: '후속조치', color: 'var(--accent-purple)' },
    { id: 'general', label: '일반', color: 'var(--text-secondary)' }
  ];

  let currentView = 'list'; // 'list' | 'form' | 'detail'
  let editingId = null;
  let photosArray = [];
  let selectedTag = 'general';

  function initUI() {
    renderList();
  }

  // --- List view ---
  async function renderList() {
    const container = document.getElementById('notes-content');
    if (!container) return;
    currentView = 'list';

    let notes = [];
    try { notes = await DB.getAll(DB.STORES.FIELD_NOTES); } catch (e) {}
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      <div class="page-header">
        <h1>📒 ${t('notes.title', '현장 메모')}</h1>
        <p class="subtitle">${t('notes.subtitle', '빠른 기록 · 사진 첨부 · 태그 관리')}</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" id="fn-search" class="form-input" placeholder="${t('notes.search_placeholder', '메모 검색...')}"
          style="flex:1;min-height:40px;font-family:var(--font-sans);font-size:0.85rem"
          oninput="FieldNotes.filterList()">
      </div>

      <button class="btn btn-primary" style="margin-bottom:16px" onclick="FieldNotes.showForm()">
        + ${t('notes.new_memo', '새 메모 작성')}
      </button>

      <!-- Tag filter -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-sm btn-primary" onclick="FieldNotes.filterTag('')" id="fn-tag-all" style="width:auto;padding:4px 10px;font-size:0.72rem">${t('common.all', '전체')}</button>
        ${TAG_OPTIONS.map(t => `
          <button class="btn btn-sm btn-secondary" onclick="FieldNotes.filterTag('${t.id}')" id="fn-tag-${t.id}" style="width:auto;padding:4px 10px;font-size:0.72rem">${t.label}</button>
        `).join('')}
      </div>

      <div id="fn-list-area">
        ${notes.length === 0 ? `
          <div class="glass-card" style="text-align:center;padding:40px 24px">
            <span style="font-size:2rem">📒</span>
            <p style="color:var(--text-secondary);margin-top:12px">${t('notes.no_notes', '메모가 없습니다.')}</p>
            <p style="color:var(--text-muted);font-size:0.8rem">${t('notes.quick_record', '현장에서 빠르게 기록하세요.')}</p>
          </div>
        ` : notes.map(n => renderNoteCard(n)).join('')}
      </div>`;
  }

  function renderNoteCard(n) {
    const d = new Date(n.date);
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const tag = TAG_OPTIONS.find(t => t.id === n.tag) || TAG_OPTIONS[TAG_OPTIONS.length - 1];
    const preview = (n.content || '').substring(0, 80) + ((n.content || '').length > 80 ? '...' : '');

    return `
      <div class="glass-card" style="padding:14px;cursor:pointer" onclick="FieldNotes.showDetail(${n.id})" data-tag="${n.tag}" data-search="${(n.title || '') + ' ' + (n.content || '')}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <span style="width:8px;height:8px;border-radius:50%;background:${tag.color};flex-shrink:0"></span>
            <span style="font-size:0.9rem;font-weight:600;line-height:1.3">${n.title || t('notes.no_title', '(제목 없음)')}</span>
          </div>
          <span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);white-space:nowrap;margin-left:8px">${dateStr}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5;margin-bottom:4px;margin-left:14px">${preview}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-left:14px">
          <span style="font-size:0.7rem;color:${tag.color};background:${tag.color}20;padding:2px 8px;border-radius:10px">${tag.label}</span>
          ${n.photos && n.photos.length > 0 ? `<span style="font-size:0.7rem;color:var(--text-muted)">📷 ${n.photos.length}</span>` : ''}
        </div>
      </div>`;
  }

  let activeTagFilter = '';

  function filterTag(tag) {
    activeTagFilter = tag;
    // Update button styles
    const allBtn = document.getElementById('fn-tag-all');
    if (allBtn) allBtn.className = `btn btn-sm ${tag === '' ? 'btn-primary' : 'btn-secondary'}`;
    TAG_OPTIONS.forEach(t => {
      const btn = document.getElementById(`fn-tag-${t.id}`);
      if (btn) btn.className = `btn btn-sm ${tag === t.id ? 'btn-primary' : 'btn-secondary'}`;
    });
    applyFilters();
  }

  function filterList() {
    applyFilters();
  }

  function applyFilters() {
    const query = (document.getElementById('fn-search')?.value || '').toLowerCase();
    document.querySelectorAll('#fn-list-area .glass-card').forEach(card => {
      const searchText = (card.dataset.search || '').toLowerCase();
      const cardTag = card.dataset.tag || '';
      const matchSearch = !query || searchText.includes(query);
      const matchTag = !activeTagFilter || cardTag === activeTagFilter;
      card.style.display = (matchSearch && matchTag) ? 'block' : 'none';
    });
  }

  // --- Form view ---
  function showForm(id) {
    currentView = 'form';
    editingId = id || null;
    photosArray = [];
    selectedTag = 'general';

    if (id) {
      DB.get(DB.STORES.FIELD_NOTES, id).then(note => {
        if (note) {
          photosArray = note.photos || [];
          selectedTag = note.tag || 'general';
          renderForm(note);
        }
      });
    } else {
      renderForm(null);
    }
  }

  function renderForm(existing) {
    const container = document.getElementById('notes-content');
    if (!container) return;

    const tag = existing?.tag || selectedTag;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="FieldNotes.renderList()" style="width:auto;padding:8px 12px">← ${t('common.list', '목록')}</button>
        <h2 style="font-size:1.1rem;font-weight:700">${existing ? t('notes.edit_memo', '메모 수정') : t('notes.new_memo', '새 현장 메모')}</h2>
      </div>

      <div class="glass-card">
        <div class="form-group">
          <label class="form-label">${t('notes.title_label', '제목')}</label>
          <input type="text" id="fn-title" class="form-input" placeholder="${t('notes.title_placeholder', '간단한 제목...')}" value="${existing?.title || ''}" style="font-family:var(--font-sans)">
        </div>

        <div class="form-group">
          <label class="form-label">${t('notes.content_label', '내용')}</label>
          <textarea id="fn-content" class="form-input" rows="5" placeholder="${t('notes.content_placeholder', '현장 메모 내용...')}" style="font-family:var(--font-sans);resize:vertical;height:auto">${existing?.content || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">${t('notes.tag', '태그')}</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${TAG_OPTIONS.map(t => `
              <button type="button" onclick="FieldNotes.selectTag('${t.id}')" id="fn-form-tag-${t.id}"
                class="btn btn-sm ${tag === t.id ? 'btn-primary' : 'btn-secondary'}"
                style="width:auto;padding:6px 12px;font-size:0.78rem">${t.label}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-title">${t('service.photos', '사진 첨부')}</div>
        <div id="fn-photo-preview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${photosArray.map((p, i) => `
            <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
              <img src="${p}" style="width:100%;height:100%;object-fit:cover">
              <button onclick="FieldNotes.removePhoto(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:0.7rem">×</button>
            </div>
          `).join('')}
        </div>
        <input type="file" id="fn-photo-input" accept="image/*" capture="environment" style="display:none" onchange="FieldNotes.handlePhoto(event)">
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('fn-photo-input').click()" style="width:auto">
          📷 ${t('service.add_photo', '사진 추가')}
        </button>
      </div>

      <button class="btn btn-success" onclick="FieldNotes.saveNote()">
        💾 ${existing ? t('notes.save_edit', '수정 저장') : t('notes.save_memo', '메모 저장')}
      </button>
      <div style="height:24px"></div>`;
  }

  function selectTag(tagId) {
    selectedTag = tagId;
    TAG_OPTIONS.forEach(t => {
      const btn = document.getElementById(`fn-form-tag-${t.id}`);
      if (btn) btn.className = `btn btn-sm ${tagId === t.id ? 'btn-primary' : 'btn-secondary'}`;
    });
  }

  function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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
    const el = document.getElementById('fn-photo-preview');
    if (!el) return;
    el.innerHTML = photosArray.map((p, i) => `
      <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <img src="${p}" style="width:100%;height:100%;object-fit:cover">
        <button onclick="FieldNotes.removePhoto(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:0.7rem">×</button>
      </div>
    `).join('');
  }

  async function saveNote() {
    const title = document.getElementById('fn-title')?.value || '';
    const content = document.getElementById('fn-content')?.value || '';

    if (!title.trim() && !content.trim()) {
      alert(t('notes.validation', '제목 또는 내용을 입력하세요.'));
      return;
    }

    const note = {
      date: new Date().toISOString(),
      title: title.trim(),
      content: content.trim(),
      tag: selectedTag,
      photos: photosArray,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        note.id = editingId;
        await DB.put(DB.STORES.FIELD_NOTES, note);
      } else {
        const newId = await DB.add(DB.STORES.FIELD_NOTES, note);
        note.id = newId;
      }

      // Cloud sync (non-blocking)
      if (typeof CloudSync !== 'undefined') {
        CloudSync.pushRecord(DB.STORES.FIELD_NOTES, note).catch(() => {});
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
    const container = document.getElementById('notes-content');
    if (!container) return;

    const n = await DB.get(DB.STORES.FIELD_NOTES, id);
    if (!n) return;

    const d = new Date(n.date);
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const tag = TAG_OPTIONS.find(t => t.id === n.tag) || TAG_OPTIONS[TAG_OPTIONS.length - 1];

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="FieldNotes.renderList()" style="width:auto;padding:8px 12px">← ${t('common.list', '목록')}</button>
        <h2 style="font-size:1.1rem;font-weight:700">${t('notes.detail_title', '메모 상세')}</h2>
      </div>

      <div class="glass-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${tag.color}"></span>
            <span style="font-size:1.05rem;font-weight:700">${n.title || t('notes.no_title', '(제목 없음)')}</span>
          </div>
          <span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)">${dateStr}</span>
        </div>

        <div style="margin-bottom:12px">
          <span style="font-size:0.72rem;color:${tag.color};background:${tag.color}20;padding:3px 10px;border-radius:10px">${tag.label}</span>
        </div>

        <div style="font-size:0.9rem;line-height:1.8;color:var(--text-primary);white-space:pre-line;margin-bottom:16px">${n.content || ''}</div>

        ${n.photos && n.photos.length > 0 ? `
          <div class="form-label">${t('service.photos', '사진')} (${n.photos.length})</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${n.photos.map(p => `
              <div style="width:100px;height:100px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
                <img src="${p}" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onclick="window.open(this.src)">
              </div>
            `).join('')}
          </div>` : ''}
      </div>

      <div class="btn-group" style="margin-top:12px">
        <button class="btn btn-sm btn-outline" onclick="FieldNotes.showForm(${n.id})">${t('common.edit', '수정')}</button>
        <button class="btn btn-sm btn-danger" onclick="FieldNotes.deleteNote(${n.id})">${t('common.delete', '삭제')}</button>
      </div>
      <div style="height:24px"></div>`;
  }

  async function deleteNote(id) {
    if (!confirm(t('notes.confirm_delete', '이 메모를 삭제하시겠습니까?'))) return;

    // Get syncId before deleting (for cloud sync)
    let syncId = null;
    try {
      const rec = await DB.get(DB.STORES.FIELD_NOTES, id);
      syncId = rec?.syncId;
    } catch (e) {}

    await DB.remove(DB.STORES.FIELD_NOTES, id);

    // Delete from cloud (non-blocking)
    if (syncId && typeof CloudSync !== 'undefined') {
      CloudSync.deleteRecord(DB.STORES.FIELD_NOTES, syncId).catch(() => {});
    }

    renderList();
  }

  return {
    initUI, renderList, showForm, showDetail, saveNote, deleteNote,
    handlePhoto, removePhoto, filterList, filterTag, selectTag
  };
})();
