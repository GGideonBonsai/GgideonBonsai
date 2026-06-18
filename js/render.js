// render.js — UI rendering (Supabase version)

export function el(id) { return document.getElementById(id); }
const DB = () => window.DB;

// ── Date formatting ───────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  if (diff < 0) return `просрочено на ${Math.abs(diff)} дн.`;
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  return `через ${diff} дн.`;
}

// ── Plant line helpers ────────────────────────────────────────────────────────
export function plantLine1(plant, species) {
  const flags = (plant.checkFlags || []).join('');
  const lCode = plant._landscapeCode || '';
  return `${plant.status||'°'}${species.code}${String(plant.number).padStart(2,'0')} ${lCode} ${species.type||''} ${flags} ${plant.shortCare||''}`.replace(/\s+/g,' ').trim();
}
export function plantLine2(plant, species) { return species.nameRu; }
export function plantLine3(plant, species) { return species.nameLat || ''; }

function sdotClass(s) {
  if (s==='✓') return 'sdot-done';
  if (s==='+') return 'sdot-add';
  return 'sdot-work';
}

// ── Species ───────────────────────────────────────────────────────────────────
export async function renderSpecies(filter='') {
  const [allSpecies, allPlants] = await Promise.all([DB().Species.all(), DB().Plants.all()]);
  const f = filter.toLowerCase();
  const list = allSpecies.filter(s =>
    !f || s.nameRu.toLowerCase().includes(f) || (s.nameLat||'').toLowerCase().includes(f) || s.code.toLowerCase().includes(f)
  );
  el('speciesBadge').textContent = list.length;
  el('speciesList').innerHTML = list.map(s => {
    const count = allPlants.filter(p => p.speciesId === s.id).length;
    const iconHtml = s.photoPath
      ? `<div class="card-icon" style="padding:0"><img src="${DB().Photos.getURL(s.photoPath)}"></div>`
      : `<div class="card-icon">${s.type||'🌱'}</div>`;
    return `
    <div class="card">
      <div class="card-row" onclick="openSpeciesList('${s.id}')">
        ${iconHtml}
        <div class="card-info">
          <div class="card-name">${s.nameRu}</div>
          <div class="card-sub" style="font-style:italic">${s.nameLat||''}</div>
          <div class="card-code">${s.code} · ${s.careCode||'—'}</div>
        </div>
        <span class="card-count">${count}</span>
        <span class="card-arrow">›</span>
      </div>
      <div class="card-actions">
        <button class="card-act-btn" onclick="openSpeciesList('${s.id}')">🌿 Открыть</button>
        <button class="card-act-btn" onclick="openModal('mo-edit-species','${s.id}')">✏️ Ред.</button>
        <button class="card-act-btn" onclick="openModal('mo-add-ra',null,'${s.id}')">🔄 Для всех</button>
      </div>
    </div>`;
  }).join('');
}

// ── Plants list ───────────────────────────────────────────────────────────────
export async function renderPlants(speciesId, filter='') {
  const [species, plants, landscapes] = await Promise.all([
    DB().Species.get(speciesId), DB().Plants.bySpecies(speciesId), DB().Landscapes.all()
  ]);
  const f = filter.toLowerCase();
  plants.forEach(p => {
    const l = landscapes.find(l => l.id === p.landscapeId);
    p._landscapeCode = l ? l.code : '';
  });
  const filtered = plants.filter(p =>
    !f || plantLine1(p,species).toLowerCase().includes(f) || species.nameRu.toLowerCase().includes(f)
  );
  el('plantsList').innerHTML = filtered.map(p => `
    <div class="plant-row" onclick="openPlantDetail('${p.id}')">
      <div class="plant-thumb" id="thumb-${p.id}">
        ${p.mainPhotoId ? `<img data-photo-id="${p.mainPhotoId}" class="lazy-thumb">` : (species.type||'🌱')}
      </div>
      <div class="plant-info">
        <div class="pl1">${plantLine1(p,species)}</div>
        <div class="pl2">${plantLine2(p,species)}</div>
        <div class="pl3">${plantLine3(p,species)}</div>
      </div>
      <div class="sdot ${sdotClass(p.status)}"></div>
    </div>`).join('');
  _loadLazyThumbs();
}

async function _loadLazyThumbs() {
  const imgs = document.querySelectorAll('.lazy-thumb[data-photo-id]');
  for (const img of imgs) {
    const ph = await DB().Photos.get(img.dataset.photoId);
    if (ph?.storage_path) img.src = DB().Photos.getURL(ph.storage_path);
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

  el('detTitle').textContent = `${species.code||''}${String(plant.number).padStart(2,'0')}`;

  const thumbEl = el('detThumb');
  if (plant.mainPhotoId) {
    const ph = await DB().Photos.get(plant.mainPhotoId);
    const url = ph ? DB().Photos.getURL(ph.storage_path) : null;
    thumbEl.innerHTML = url ? `<img src="${url}">` : `<span style="font-size:60px">${species.type||'🌱'}</span>`;
  } else {
    thumbEl.innerHTML = `<span style="font-size:60px">${species.type||'🌱'}</span>`;
  }

  el('detCodes').innerHTML = `
    <div class="dc1">${plantLine1(plant,species)}</div>
    <div class="dc2">${plantLine2(plant,species)}</div>
    <div class="dc3">${plantLine3(plant,species)}</div>`;

  el('itab0').innerHTML = `
    <div class="fg"><label class="fl">Синонимы</label><div class="fv">${species.synonyms||'—'}</div></div>
    <button class="add-btn" style="margin-bottom:12px" onclick="openModal('mo-add-plant','${plant.speciesId}')">＋ Добавить экземпляр</button>
    <div class="fg"><label class="fl">Сорт / Вариация</label><div class="fv">${plant.variety||'—'}</div></div>
    <div class="fg"><label class="fl">Способ получения</label><div class="fv">${plant.origin||'—'}</div></div>
    <div class="fg"><label class="fl">Стиль бонсай</label><div class="fv">${plant.bonsaiStyle||'—'}</div></div>
    <div class="fg"><label class="fl">Дата начала</label><div class="fv">${formatDate(plant.dateStart)}</div></div>
    ${landscape ? `<div class="link-row" onclick="goToLandscape('${landscape.id}')"><span class="link-label">Ландшафт</span><span class="link-val">${landscape.code} ${landscape.name} ›</span></div>` : ''}
    ${pot ? `<div class="link-row" onclick="goToPot('${pot.id}')"><span class="link-label">Горшок</span><span class="link-val">${pot.code} ›</span></div>` : ''}
    ${plant.country ? `<div class="fg"><label class="fl">Страна</label><div class="fv">${plant.country}</div></div>` : ''}
    ${plant.price ? `<div class="fg"><label class="fl">Цена</label><div class="fv">${plant.price}</div></div>` : ''}
    ${plant.qty ? `<div class="fg"><label class="fl">Количество</label><div class="fv">${plant.qty}</div></div>` : ''}
    ${plant.comment ? `<div class="fg"><label class="fl">Комментарий</label><div class="fv">${plant.comment}</div></div>` : ''}
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
  let html = photos.length === 0 ? '<div class="empty-msg">📷 Нет фотографий</div>' : '<div class="photo-grid">';
  for (const ph of photos) {
    const url = DB().Photos.getURL(ph.storage_path);
    const isMain = ph.id === plant.mainPhotoId;
    html += `
      <div class="photo-cell ${isMain?'main':''}">
        <img src="${url}" onclick="viewPhoto('${url}')">
        <div class="photo-meta">
          <div class="photo-meta-date">${formatDate(ph.date)}</div>
          ${ph.note ? `<div class="photo-meta-note">${ph.note}</div>` : ''}
        </div>
        <div class="photo-meta-btns">
          <button class="${isMain?'active':''}" onclick="setMainPhotoUI('${plant.id}','${ph.id}')">${isMain?'★':'☆'}</button>
          <button onclick="editPhotoMeta('${ph.id}','${plant.id}')">✏️</button>
          <button onclick="deletePhotoUI('${plant.id}','${ph.id}')">✕</button>
        </div>
      </div>`;
  }
  if (photos.length > 0) html += '</div>';
  html += `<button class="add-btn" onclick="openAddPhoto('${plant.id}')">＋ Добавить фото</button>`;
  el('itab1').innerHTML = html;
}

// ── History tab ───────────────────────────────────────────────────────────────
export async function renderHistoryTab(plant) {
  const [tasks, regularActions] = await Promise.all([
    DB().Tasks.forPlant(plant.id),
    DB().RegularActions.forPlant(plant.id)
  ]);
  const history = (plant.history || []).slice().reverse();

  let html = `
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <button class="hist-subtab on" id="hst-deals" onclick="switchHistSubtab('deals','${plant.id}')">📋 Дела</button>
      <button class="hist-subtab" id="hst-history" onclick="switchHistSubtab('history','${plant.id}')">📜 История</button>
    </div>
    <div id="hst-deals-content">`;

  // Tasks
  html += `<div class="sec-title" style="margin-bottom:6px">Задачи</div>`;
  html += tasks.length === 0 ? '<div class="empty-msg" style="padding:8px 0">Нет задач</div>' :
    tasks.map(t => `
      <div class="deal-item">
        <div class="deal-check" onclick="completeTask('${t.id}','${plant.id}')"></div>
        <div class="deal-info">
          <div class="deal-title">${t.name}</div>
          ${t.date ? `<div class="deal-date">${formatDate(t.date)}</div><div class="deal-countdown">${daysUntil(t.date)}</div>` : ''}
          ${t.comment ? `<div class="hist-comment">${t.comment}</div>` : ''}
        </div>
      </div>`).join('');
  html += `<button class="add-btn" style="margin-bottom:12px" onclick="openModal('mo-add-task','${plant.id}')">＋ Задача</button>`;

  // Regular actions
  html += `<div class="sec-title" style="margin-bottom:6px;margin-top:8px">Регулярные действия</div>`;
  html += regularActions.length === 0 ? '<div class="empty-msg" style="padding:8px 0">Нет регулярных действий</div>' :
    regularActions.map(ra => `
      <div class="deal-item">
        <div class="deal-check" onclick="completeRegularAction('${ra.id}','${plant.id}')"></div>
        <div class="deal-info">
          <div class="deal-title">${ra.name}</div>
          ${ra.nextDate ? `<div class="deal-date">${formatDate(ra.nextDate)}</div><div class="deal-countdown">${daysUntil(ra.nextDate)}</div>` : ''}
          <div style="font-size:11px;color:var(--stone)">Каждые ${ra.periodDays} дн.</div>
          ${ra.lastDone ? `<div style="font-size:11px;color:var(--stone)">Последнее: ${formatDate(ra.lastDone)}</div>` : ''}
        </div>
        <button onclick="editRegularAction('${ra.id}','${plant.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px">✏️</button>
      </div>`).join('');
  html += `<button class="add-btn" onclick="openModal('mo-add-ra','${plant.id}')">＋ Регулярное действие</button>`;
  html += `</div>`;

  // History
  html += `<div id="hst-history-content" style="display:none">`;
  html += history.length === 0 ? '<div class="empty-msg">История пуста</div>' :
    history.map(h => `
      <div class="hist-item">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="hist-date">${formatDate(h.date)}</div>
          <button class="hist-btn" onclick="openModal('mo-history','${plant.id}','${h.id}')">✏️</button>
        </div>
        <div class="hist-title">${h.title}</div>
        ${h.comment ? `<div class="hist-comment">${h.comment}</div>` : ''}
        ${h.type==='regular' ? `<div style="font-size:10px;color:var(--moss);margin-top:2px">🔄 Регулярное</div>` : ''}
      </div>`).join('');
  html += `<div class="div"></div>
    <button class="add-btn" onclick="openModal('mo-history','${plant.id}')">＋ Добавить запись</button>
  </div>`;

  el('itab2').innerHTML = html;
}

export function switchHistSubtab(tab, plantId) {
  el('hst-deals-content').style.display    = tab==='deals' ? '' : 'none';
  el('hst-history-content').style.display  = tab==='history' ? '' : 'none';
  el('hst-deals').classList.toggle('on',   tab==='deals');
  el('hst-history').classList.toggle('on', tab==='history');
}

// ── Landscapes ────────────────────────────────────────────────────────────────
export async function renderLandscapes(filter='') {
  const [all, allPlants] = await Promise.all([DB().Landscapes.all(), DB().Plants.all()]);
  const f = filter.toLowerCase();
  const list = all.filter(l => !f || l.name.toLowerCase().includes(f) || l.code.toLowerCase().includes(f));
  el('lsBadge').textContent = list.length;
  el('lsList').innerHTML = list.map(l => {
    const locs = l.locations || [];
    const locationPhotos = l.location_photos || {};
    return `
    <div class="ls-card" data-ls-id="${l.id}">
      <div class="ls-hdr" onclick="toggleLs('${l.id}')">
        <div class="ls-icon">${l.light||'🌍'}</div>
        <div style="flex:1">
          <div class="ls-name">${l.name}</div>
          <div class="ls-code">${l.code} · ${l.tempMin||'?'}–${l.tempMax||'?'}°C · ${l.humidity||''}</div>
        </div>
        <button onclick="event.stopPropagation();openModal('mo-edit-ls','${l.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px 8px">✏️</button>
        <span class="card-arrow">›</span>
      </div>
      <div class="ls-locs" id="lslocs-${l.id}">
        ${locs.length===0 ? '<div style="padding:8px 12px;font-size:12px;color:var(--stone)">Нет локаций</div>' :
          locs.map(loc => {
            const plantCount = allPlants.filter(p => p.landscapeId === l.id && p._locCode === loc.code).length;
            const photoPath = locationPhotos[loc.id];
            const photoUrl = photoPath ? DB().Photos.getURL(photoPath) : null;
            return `
            <div class="loc-item" onclick="renderLocationPlants('${l.id}','${loc.id}','${loc.name}','${loc.code}')">
              <div class="loc-thumb">${photoUrl ? `<img src="${photoUrl}">` : '📍'}</div>
              <div style="flex:1">
                <div class="loc-name">${loc.name}</div>
                <div class="loc-code">${loc.code}</div>
              </div>
              <button onclick="event.stopPropagation();openAddLocationPhoto('${l.id}','${loc.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px">📷</button>
              <span class="loc-count">${allPlants.filter(p=>p.landscapeId===l.id).length}</span>
            </div>`;
          }).join('')}
        <button class="add-btn" style="margin:6px 8px;width:calc(100% - 16px)" onclick="addLocation('${l.id}')">＋ Локация</button>
      </div>
    </div>`;
  }).join('');
}

export function toggleLs(id) {
  el(`lslocs-${id}`)?.classList.toggle('open');
}

// ── Location plants ───────────────────────────────────────────────────────────
export async function renderLocationPlants(landscapeId, locId, locName, locCode) {
  const [allPlants, allSpecies, landscape] = await Promise.all([
    DB().Plants.all(), DB().Species.all(), DB().Landscapes.get(landscapeId)
  ]);
  // Show plants in this landscape
  const plants = allPlants.filter(p => p.landscapeId === landscapeId);
  const container = el('location-plants-list');
  const title = el('location-plants-title');
  if (title) title.textContent = `${locName} (${locCode})`;
  if (!container) {
    // Open modal
    openModal('mo-location-plants');
    return;
  }
  container.innerHTML = plants.length === 0
    ? '<div class="empty-msg">Нет растений в этой локации</div>'
    : plants.map(p => {
        const s = allSpecies.find(sp => sp.id === p.speciesId) || {};
        p._landscapeCode = locCode;
        return `
        <div class="plant-row" onclick="openPlantDetail('${p.id}')">
          <div class="plant-thumb">${p.mainPhotoId ? `<img data-photo-id="${p.mainPhotoId}" class="lazy-thumb">` : (s.type||'🌱')}</div>
          <div class="plant-info">
            <div class="pl1">${plantLine1(p,s)}</div>
            <div class="pl2">${plantLine2(p,s)}</div>
            <div class="pl3">${plantLine3(p,s)}</div>
          </div>
        </div>`;
      }).join('');
  openModal('mo-location-plants');
  _loadLazyThumbs();
}

// ── Pots ─────────────────────────────────────────────────────────────────────
export async function renderPots(filter='') {
  const all = await DB().Pots.all();
  const f = filter.toLowerCase();
  const mats = {PL:'Пластик',CL:'Глина',CR:'Керамика',CN:'Бетон',FB:'Ткань',WD:'Дерево',MT:'Металл'};
  let html = '';
  for (const mat of ['PL','CL','CR','CN','FB','WD','MT']) {
    const pots = all.filter(p => p.material===mat && (!f || p.code.toLowerCase().includes(f)));
    html += `<div class="sec-hdr" style="margin-top:12px"><span class="sec-title">${mats[mat]}</span><span class="badge">${pots.length}</span></div>`;
    html += pots.map(p => `
      <div class="pot-row" data-pot-id="${p.id}">
        <div class="pot-icon">🪴</div>
        <div style="flex:1"><div class="pot-code">${p.code}</div><div class="pot-mat">${mats[p.material]||''}</div></div>
        <button onclick="openModal('mo-edit-pot','${p.id}')" style="background:none;border:none;font-size:13px;color:var(--stone);cursor:pointer;padding:4px 8px">✏️</button>
      </div>`).join('');
    html += `<button class="add-btn" onclick="openModal('mo-add-pot','${mat}')">＋ ${mats[mat]}</button>`;
  }
  el('potsList').innerHTML = html;
}

// ── Deals ─────────────────────────────────────────────────────────────────────
export async function renderDeals(filter='') {
  const [tasks, regularActions, allSpecies, allPlants] = await Promise.all([
    DB().Tasks.pending(), DB().RegularActions.pending(), DB().Species.all(), DB().Plants.all()
  ]);

  const getPlantName = (plantId) => {
    const p = allPlants.find(pl => pl.id === plantId);
    if (!p) return null;
    const s = allSpecies.find(sp => sp.id === p.speciesId);
    return s ? `${s.nameRu} · ${s.code}${String(p.number).padStart(2,'0')}` : `Растение #${p.number}`;
  };

  const f = filter.toLowerCase();

  const items = [
    ...tasks.map(t => {
      let plantName = null;
      if (t.type==='species') {
        const s = allSpecies.find(sp => sp.id === t.targetId);
        plantName = s ? `Вид: ${s.nameRu}` : null;
      } else {
        plantName = getPlantName(t.targetId);
      }
      return { date: t.date||'9999-99-99', type:'task', obj:t, plantName, targetId: t.targetId };
    }),
    ...regularActions.map(ra => ({
      date: ra.nextDate||'9999-99-99', type:'regular', obj:ra,
      plantName: getPlantName(ra.plantId), targetId: ra.plantId
    }))
  ]
  .filter(item => !f || (item.plantName||'').toLowerCase().includes(f) || item.obj.name?.toLowerCase().includes(f))
  .sort((a,b) => a.date.localeCompare(b.date));

  el('fabBadge').textContent = items.length;
  el('dealsBadge') && (el('dealsBadge').textContent = items.length);

  if (items.length===0) {
    el('dealsList').innerHTML = '<div class="empty-msg">Нет активных дел 🌿</div>';
    return;
  }

  el('dealsList').innerHTML = items.map(item => {
    const isTask = item.type==='task';
    const obj = item.obj;
    return `
    <div class="deal-item">
      <div class="deal-check" onclick="${isTask ? `completeTask('${obj.id}',null)` : `completeRegularAction('${obj.id}',null)`}">
        <span style="font-size:10px;color:var(--stone);pointer-events:none">✓</span>
      </div>
      <div class="deal-info">
        <div class="deal-title">${obj.name}</div>
        ${item.plantName ? `<div class="deal-plant">${item.plantName}</div>` : ''}
        ${obj.date||obj.nextDate ? `
          <div class="deal-date">${formatDate(obj.date||obj.nextDate)}</div>
          <div class="deal-countdown">${daysUntil(obj.date||obj.nextDate)}</div>` : ''}
        ${obj.comment ? `<div class="hist-comment">${obj.comment}</div>` : ''}
        <span class="tag ${isTask?'tag-pl':'tag-ra'}">${isTask?'Задача':'Регулярное'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function renderStats() {
  const [allSpecies, allPlants, allPots] = await Promise.all([
    DB().Species.all(), DB().Plants.all(), DB().Pots.all()
  ]);
  const totalSpent = allPlants.reduce((s, p) => s + (p.price||0) * (p.qty||1), 0);
  const potCount = allPots.length;

  el('stats-content').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon">🌿</div>
        <div class="stat-value">${allSpecies.length}</div>
        <div class="stat-label">Видов</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌱</div>
        <div class="stat-value">${allPlants.length}</div>
        <div class="stat-label">Растений</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🪴</div>
        <div class="stat-value">${potCount}</div>
        <div class="stat-label">Горшков</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${totalSpent.toLocaleString()}</div>
        <div class="stat-label">Потрачено</div>
      </div>
    </div>`;
}

// ── Trash ─────────────────────────────────────────────────────────────────────
export async function renderTrash() {
  const items = await DB().Trash.all();
  const typeNames = { species:'Вид', plant:'Растение', landscape:'Ландшафт', pot:'Горшок' };
  const typeIcons = { species:'🌿', plant:'🌱', landscape:'🌍', pot:'🪴' };
  const container = el('trash-list');
  if (!container) return;
  if (items.length===0) {
    container.innerHTML = '<div class="empty-msg">Корзина пуста 🗑</div>';
    return;
  }
  container.innerHTML = `
    <button class="btn btn-d" style="margin-bottom:12px" onclick="clearTrash()">🗑 Очистить корзину</button>
    ${items.map(item => `
    <div class="trash-item">
      <div style="font-size:24px;flex-shrink:0">${typeIcons[item.type]||'📦'}</div>
      <div class="trash-info">
        <div class="trash-name">${item.data?.name_ru || item.data?.name || item.data?.code || '—'}</div>
        <div class="trash-type">${typeNames[item.type]||item.type}</div>
        <div class="trash-date">${formatDate(item.deleted_at?.split('T')[0])}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn-restore" onclick="restoreFromTrash('${item.id}')">↩ Восстановить</button>
        <button onclick="deleteFromTrash('${item.id}')" style="background:none;border:1px solid var(--danger);color:var(--danger);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">✕</button>
      </div>
    </div>`).join('')}`;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export async function updateBadge() {
  const [tasks, ra] = await Promise.all([DB().Tasks.pending(), DB().RegularActions.pending()]);
  const count = tasks.length + ra.length;
  el('fabBadge') && (el('fabBadge').textContent = count);
  el('dealsBadge') && (el('dealsBadge').textContent = count);
}
