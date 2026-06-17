// render.js — UI rendering (Supabase version)

export function el(id) { return document.getElementById(id); }

const DB = () => window.DB;

export function plantLine1(plant, species) {
  const flags = (plant.checkFlags || []).join('');
  const lCode = plant._landscapeCode || '';
  return `${plant.status || '°'}${species.code}${String(plant.number).padStart(2,'0')} ${lCode} ${species.type || ''} ${flags} ${plant.shortCare || ''}`.replace(/\s+/g,' ').trim();
}
export function plantLine2(plant, species) { return species.nameRu; }
export function plantLine3(plant, species) { return species.nameLat || ''; }

function sdotClass(s) {
  if (s === '✓') return 'sdot-done';
  if (s === '+') return 'sdot-add';
  return 'sdot-work';
}

// ── Species ───────────────────────────────────────────────────────────────────
export async function renderSpecies(filter = '') {
  const [allSpecies, allPlants] = await Promise.all([DB().Species.all(), DB().Plants.all()]);
  const f = filter.toLowerCase();
  const list = allSpecies.filter(s =>
    !f || s.nameRu.toLowerCase().includes(f) || (s.nameLat||'').toLowerCase().includes(f) || s.code.toLowerCase().includes(f)
  );
  el('speciesBadge').textContent = list.length;
  el('speciesList').innerHTML = list.map(s => {
    const count = allPlants.filter(p => p.speciesId === s.id).length;
    const iconHtml = s.photoPath
      ? `<div class="card-icon" style="overflow:hidden;padding:0"><img src="${DB().Photos.getURL(s.photoPath)}" style="width:100%;height:100%;object-fit:cover"></div>`
      : `<div class="card-icon">${s.type || '🌱'}</div>`;
    return `
    <div class="card">
      <div class="card-row" onclick="openSpeciesList('${s.id}')">
        ${iconHtml}
        <div class="card-info">
          <div class="card-name">${s.nameRu}</div>
          <div class="card-sub" style="font-style:italic">${s.nameLat || ''}</div>
          <div class="card-code">${s.code} · ${s.careCode || '—'}</div>
        </div>
        <span class="card-count">${count}</span>
        <span class="card-arrow">›</span>
      </div>
      <div class="card-actions">
        <button class="card-act-btn" onclick="openSpeciesList('${s.id}')">🌿 Открыть</button>
        <button class="card-act-btn" onclick="openModal('mo-edit-species','${s.id}')">✏️ Редактировать</button>
      </div>
    </div>`;
  }).join('');
}

// ── Plants list ───────────────────────────────────────────────────────────────
export async function renderPlants(speciesId, filter = '') {
  const [species, plants, landscapes] = await Promise.all([
    DB().Species.get(speciesId),
    DB().Plants.bySpecies(speciesId),
    DB().Landscapes.all()
  ]);
  const f = filter.toLowerCase();
  plants.forEach(p => {
    const l = landscapes.find(l => l.id === p.landscapeId);
    p._landscapeCode = l ? l.code : '';
  });
  const filtered = plants.filter(p =>
    !f || plantLine1(p,species).toLowerCase().includes(f) || plantLine2(p,species).toLowerCase().includes(f)
  );

  el('plantsList').innerHTML = filtered.map(p => `
    <div class="plant-row" onclick="openPlantDetail('${p.id}')">
      <div class="plant-thumb" id="thumb-${p.id}">
        ${p.mainPhotoId ? `<img data-photo-id="${p.mainPhotoId}" class="lazy-thumb">` : (species.type || '🌱')}
      </div>
      <div class="plant-info">
        <div class="pl1">${plantLine1(p, species)}</div>
        <div class="pl2">${plantLine2(p, species)}</div>
        <div class="pl3">${plantLine3(p, species)}</div>
      </div>
      <div class="sdot ${sdotClass(p.status)}"></div>
    </div>`).join('');

  _loadLazyThumbs();
}

async function _loadLazyThumbs() {
  const imgs = document.querySelectorAll('.lazy-thumb[data-photo-id]');
  for (const img of imgs) {
    const ph = await DB().Photos.get(img.dataset.photoId);
    if (ph?.storage_path) {
      const url = DB().Photos.getURL(ph.storage_path);
      if (url) img.src = url;
    }
  }
}

// ── Plant detail ──────────────────────────────────────────────────────────────
export async function renderPlantDetail(plantId) {
  const [plant, allSpecies, landscapes, pots] = await Promise.all([
    DB().Plants.get(plantId), DB().Species.all(), DB().Landscapes.all(), DB().Pots.all()
  ]);
  const species   = allSpecies.find(s => s.id === plant.speciesId) || {};
  const landscape = landscapes.find(l => l.id === plant.landscapeId);
  const pot       = pots.find(p => p.id === plant.potId);
  plant._landscapeCode = landscape ? landscape.code : '';

  el('detTitle').textContent = `${species.code || ''}${String(plant.number).padStart(2,'0')}`;

  // Thumb
  const thumbEl = el('detThumb');
  if (plant.mainPhotoId) {
    const ph = await DB().Photos.get(plant.mainPhotoId);
    const url = ph ? DB().Photos.getURL(ph.storage_path) : null;
    thumbEl.innerHTML = url
      ? `<img id="detThumbImg" src="${url}" style="width:100%;height:100%;object-fit:cover">`
      : `<span style="font-size:60px">${species.type || '🌱'}</span>`;
  } else {
    thumbEl.innerHTML = `<span style="font-size:60px">${species.type || '🌱'}</span>`;
  }

  // Codes
  el('detCodes').innerHTML = `
    <div class="dc1">${plantLine1(plant, species)}</div>
    <div class="dc2">${plantLine2(plant, species)}</div>
    <div class="dc3">${plantLine3(plant, species)}</div>`;

  // Tab 0: Description
  el('itab0').innerHTML = `
    <div class="fg"><label class="fl">Синонимы</label><div class="fv">${species.synonyms || '—'}</div></div>
    <button class="add-btn" style="margin-bottom:12px" onclick="openModal('mo-add-plant','${plant.speciesId}')">＋ Добавить экземпляр</button>
    <div class="fg"><label class="fl">Сорт / Вариация</label><div class="fv">${plant.variety || '—'}</div></div>
    <div class="fg"><label class="fl">Способ получения</label><div class="fv">${plant.origin || '—'}</div></div>
    <div class="fg"><label class="fl">Стиль бонсай</label><div class="fv">${plant.bonsaiStyle || '—'}</div></div>
    <div class="fg"><label class="fl">Дата начала</label><div class="fv">${plant.dateStart || '—'}</div></div>
    ${landscape ? `<div class="link-row" onclick="goToLandscape('${landscape.id}')"><span class="link-label">Ландшафт</span><span class="link-val">${landscape.code} ${landscape.name} ›</span></div>` : ''}
    ${pot ? `<div class="link-row" onclick="goToPot('${pot.id}')"><span class="link-label">Горшок</span><span class="link-val">${pot.code} ›</span></div>` : ''}
    ${plant.country ? `<div class="fg"><label class="fl">Страна</label><div class="fv">${plant.country}</div></div>` : ''}
    ${plant.price  ? `<div class="fg"><label class="fl">Цена</label><div class="fv">${plant.price}</div></div>` : ''}
    ${plant.qty    ? `<div class="fg"><label class="fl">Количество</label><div class="fv">${plant.qty}</div></div>` : ''}
    ${plant.comment? `<div class="fg"><label class="fl">Комментарий</label><div class="fv">${plant.comment}</div></div>` : ''}
    <div class="div"></div>
    <button class="btn btn-s" onclick="openModal('mo-edit-plant','${plant.id}')">✏️ Редактировать</button>
    <button class="btn btn-s" onclick="clonePlant('${plant.id}')">📋 Клонировать</button>
    <button class="btn btn-d" onclick="deletePlant('${plant.id}')">🗑 Удалить</button>`;

  await renderPhotosTab(plant);
  await renderHistoryTab(plant);
}

// ── Photos tab ────────────────────────────────────────────────────────────────
export async function renderPhotosTab(plant) {
  const photos = await DB().Photos.forPlant(plant.id);
  let html = '';
  if (photos.length === 0) {
    html = '<div class="empty-msg">📷 Нет фотографий</div>';
  } else {
    html = '<div class="photo-grid">';
    for (const ph of photos) {
      const url    = DB().Photos.getURL(ph.storage_path);
      const isMain = ph.id === plant.mainPhotoId;
      html += `
        <div class="photo-cell ${isMain ? 'main' : ''}">
          <img src="${url}" onclick="viewPhoto('${url}')">
          <div class="photo-meta">
            <div class="photo-meta-date">${ph.date || ''}</div>
            ${ph.note ? `<div class="photo-meta-note">${ph.note}</div>` : ''}
          </div>
          <div class="photo-meta-btns">
            <button class="${isMain?'active':''}" onclick="setMainPhotoUI('${plant.id}','${ph.id}')">${isMain?'★':'☆'}</button>
            <button onclick="editPhotoMeta('${ph.id}','${plant.id}')">✏️</button>
            <button onclick="deletePhotoUI('${plant.id}','${ph.id}')">✕</button>
          </div>
        </div>`;
    }
    html += '</div>';
  }
  html += `<button class="add-btn" onclick="openAddPhoto('${plant.id}')">＋ Добавить фото</button>`;
  el('itab1').innerHTML = html;
}

// ── History tab ───────────────────────────────────────────────────────────────
export async function renderHistoryTab(plant) {
  const pending = await DB().Tasks.forPlant(plant.id);
  const history = (plant.history || []).slice().reverse();
  let html = '';

  if (pending.length > 0) {
    html += '<div class="sec-title" style="margin-bottom:8px">Дела</div>';
    html += pending.map(t => `
      <div class="deal-item">
        <div class="deal-check" onclick="completeTask('${t.id}','${plant.id}')"></div>
        <div class="deal-info">
          <div class="deal-title">${t.name}</div>
          ${t.date ? `<div class="deal-date">${t.date}</div>` : ''}
        </div>
      </div>`).join('');
    html += '<div class="div"></div>';
  }

  html += '<div class="sec-title" style="margin-bottom:8px">История</div>';
  html += history.length === 0
    ? '<div class="empty-msg">История пуста</div>'
    : history.map(h => `
      <div class="hist-item">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="hist-date">${h.date}</div>
          <button class="hist-btn" onclick="openModal('mo-history','${plant.id}','${h.id}')">✏️</button>
        </div>
        <div class="hist-title">${h.title}</div>
        ${h.comment ? `<div class="hist-comment">${h.comment}</div>` : ''}
      </div>`).join('');

  html += `<div class="div"></div><button class="add-btn" onclick="openModal('mo-history','${plant.id}')">＋ Добавить запись</button>`;
  el('itab2').innerHTML = html;
}

// ── Landscapes ────────────────────────────────────────────────────────────────
export async function renderLandscapes(filter = '') {
  const all = await DB().Landscapes.all();
  const f   = filter.toLowerCase();
  const list = all.filter(l => !f || l.name.toLowerCase().includes(f) || l.code.toLowerCase().includes(f));
  el('lsBadge').textContent = list.length;
  el('lsList').innerHTML = list.map(l => `
    <div class="ls-card" data-ls-id="${l.id}">
      <div class="ls-hdr" onclick="toggleLs('${l.id}')">
        <div class="ls-icon">${l.light || '🌍'}</div>
        <div style="flex:1">
          <div class="ls-name">${l.name}</div>
          <div class="ls-code">${l.code} · ${l.tempMin||'?'}–${l.tempMax||'?'}°C · ${l.humidity||''}</div>
        </div>
        <button onclick="event.stopPropagation();openModal('mo-edit-ls','${l.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px 8px">✏️</button>
        <span class="card-arrow">›</span>
      </div>
      <div class="ls-locs" id="lslocs-${l.id}">
        ${(l.locations||[]).length === 0
          ? '<div style="padding:8px 12px;font-size:12px;color:var(--stone)">Нет локаций</div>'
          : (l.locations||[]).map(loc => `
            <div class="loc-item">
              <div><div class="loc-name">${loc.name}</div><div class="loc-code">${loc.code}</div></div>
              <span style="color:var(--ash);font-size:14px">›</span>
            </div>`).join('')}
        <button class="add-btn" style="margin:6px 8px;width:calc(100% - 16px)" onclick="addLocation('${l.id}')">＋ Локация</button>
      </div>
    </div>`).join('');
}

export function toggleLs(id) {
  el(`lslocs-${id}`)?.classList.toggle('open');
}

// ── Pots ─────────────────────────────────────────────────────────────────────
export async function renderPots(filter = '') {
  const all = await DB().Pots.all();
  const f   = filter.toLowerCase();
  const matNames = {PL:'Пластик',CL:'Глина',CR:'Керамика',CN:'Бетон',FB:'Ткань',WD:'Дерево',MT:'Металл'};
  let html  = '';
  for (const mat of ['PL','CL','CR','CN','FB','WD','MT']) {
    const pots = all.filter(p => p.material === mat && (!f || p.code.toLowerCase().includes(f)));
    html += `<div class="sec-hdr" style="margin-top:12px"><span class="sec-title">${matNames[mat]}</span><span class="badge">${pots.length}</span></div>`;
    html += pots.map(p => `
      <div class="pot-row" data-pot-id="${p.id}">
        <div class="pot-icon">🪴</div>
        <div style="flex:1"><div class="pot-code">${p.code}</div><div class="pot-mat">${matNames[p.material]||''}</div></div>
        <button onclick="openModal('mo-edit-pot','${p.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px 8px">✏️</button>
      </div>`).join('');
    html += `<button class="add-btn" onclick="openModal('mo-add-pot','${mat}')">＋ ${matNames[mat]}</button>`;
  }
  el('potsList').innerHTML = html;
}

// ── Deals ────────────────────────────────────────────────────────────────────
export async function renderDeals() {
  const [tasks, allSpecies, allPlants] = await Promise.all([DB().Tasks.pending(), DB().Species.all(), DB().Plants.all()]);
  el('fabBadge').textContent = tasks.length;
  if (tasks.length === 0) { el('dealsList').innerHTML = '<div class="empty-msg">Нет активных дел 🌿</div>'; return; }
  el('dealsList').innerHTML = tasks.map(t => {
    let name = '—';
    if (t.type === 'species') { const s = allSpecies.find(s => s.id === t.targetId); name = s?.nameRu || '—'; }
    else { const p = allPlants.find(p => p.id === t.targetId); if (p) { const s = allSpecies.find(s => s.id === p.speciesId); name = s ? `${s.code}${String(p.number).padStart(2,'0')}` : '—'; } }
    return `
    <div class="deal-item">
      <div class="deal-check" onclick="completeTask('${t.id}',null)"></div>
      <div class="deal-info">
        <div class="deal-title">${t.name}</div>
        <div class="deal-sub">${name}</div>
        ${t.date ? `<div class="deal-date">${t.date}</div>` : ''}
        <span class="tag ${t.type==='species'?'tag-sp':'tag-pl'}">${t.type==='species'?'Для вида':'Для растения'}</span>
      </div>
    </div>`;
  }).join('');
}

export async function updateBadge() {
  const pending = await DB().Tasks.pending();
  el('fabBadge').textContent = pending.length;
}

