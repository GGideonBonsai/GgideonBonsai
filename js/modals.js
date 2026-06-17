// modals.js — Modal logic (Supabase version)
import { renderSpecies, renderPlants, renderPlantDetail, renderLandscapes, renderPots, renderDeals, renderHistoryTab, renderPhotosTab, updateBadge } from './render.js';

const DB = () => window.DB;

// ── Modal stack ───────────────────────────────────────────────────────────────
const stack = [];
export function openModal(id, ...args) {
  const ov = document.getElementById(id);
  if (!ov) return;
  ov._args = args;
  ov.classList.add('open');
  stack.push(id);
  _fill(id, args);
}
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  const i = stack.lastIndexOf(id); if (i !== -1) stack.splice(i,1);
}
export function closeTop() {
  if (!stack.length) return false;
  closeModal(stack[stack.length-1]); return true;
}

async function _fill(id, args) {
  switch(id) {
    case 'mo-edit-species': return _fillEditSpecies(args[0]);
    case 'mo-add-plant':    return _fillAddPlant(args[0]);
    case 'mo-edit-plant':   return _fillEditPlant(args[0]);
    case 'mo-history':      return _fillHistory(args[0], args[1]);
    case 'mo-photo':        return _fillPhoto(args[0]);
    case 'mo-edit-ls':      return _fillEditLs(args[0]);
    case 'mo-add-pot':      return _fillAddPot(args[0]);
    case 'mo-edit-pot':     return _fillEditPot(args[0]);
    case 'mo-deals':        return renderDeals();
    case 'mo-add-task':     return _fillAddTask(args[0]);
    case 'mo-add-ra':       return _fillAddRa(args[0]);
  }
}

function _fillAddRa(plantId) {
  document.getElementById('mo-add-ra')._plantId = plantId;
  document.getElementById('ra-name').value = '';
  document.getElementById('ra-period').value = '7';
  document.getElementById('ra-next-date').value = new Date().toISOString().split('T')[0];
}

// ── Chip helpers ──────────────────────────────────────────────────────────────
export function selChip(el, g) { document.querySelectorAll(`#${g} .chip`).forEach(c=>c.classList.remove('on')); el.classList.add('on'); }
export function togChip(el) { el.classList.toggle('on'); }
function getChip(g) { return document.querySelector(`#${g} .chip.on`)?.dataset?.v || ''; }
function getChips(g) { return [...document.querySelectorAll(`#${g} .chip.on`)].map(c=>c.dataset.v); }
function setChip(g,v) { document.querySelectorAll(`#${g} .chip`).forEach(c=>c.classList.toggle('on',c.dataset.v===v)); }
function setChips(g,vs) { document.querySelectorAll(`#${g} .chip`).forEach(c=>c.classList.toggle('on',vs.includes(c.dataset.v))); }
function v(id) { return document.getElementById(id)?.value||''; }
function sv(id,val) { const e=document.getElementById(id); if(e) e.value=val||''; }

const STYLES = ['Чоккан — формальный прямой','Мёги — неформальный прямой','Шакан — склонный','Кенгай — каскадный','Хан-Кенгай — полукаскадный','Фукинанагаши — подветренный','Бунжинги — литерат','Хокидачи — веничный','Сокан — двойной ствол','Санкан — три ствола','Кабудачи — многоствольный','Икадабуки — плот','Неагари — обнажённые корни','Сэкиддзёдзю — корни на камне','Ишитцуки — корень на камне','Пенцзин-Сайкэй — миниатюрный пейзаж','Недзикан — крученый ствол','Банкан — изогнутый','Такодзукури — осьминог','Сабамики — выдалбливаемый ствол','Шаримики — мёртвая древесина','Канжо — петля/кольцо','Ёса-Уэ — лесная/групповая посадка','Бёртон-Космический','Другой'];
function styleOpts(sel='') { return STYLES.map(s=>`<option ${s===sel?'selected':''}>${s}</option>`).join(''); }

// ── Species ───────────────────────────────────────────────────────────────────
export async function saveAddSpecies() {
  const nameRu=v('as-ru').trim(), code=v('as-code').trim();
  if(!nameRu||!code) return alert('Заполните название и код');
  await DB().Species.save({nameRu,nameLat:v('as-lat').trim(),code,type:getChip('as-type')||'🌳',synonyms:v('as-syn').trim(),careCode:v('as-care').trim()});
  closeModal('mo-add-species'); renderSpecies();
}
async function _fillEditSpecies(id) {
  const s=await DB().Species.get(id);
  document.getElementById('mo-edit-species')._editId=id;
  sv('es-ru',s.nameRu);sv('es-lat',s.nameLat);sv('es-code',s.code);sv('es-syn',s.synonyms);sv('es-care',s.careCode);
  setChip('es-type',s.type||'🌳');
  // Show current photo if exists
  const prev=document.getElementById('es-photo-preview');
  if(prev) prev.innerHTML = s.photoPath
    ? `<img src="${DB().Photos.getURL(s.photoPath)}" style="width:100%;max-height:150px;object-fit:cover;border-radius:6px;margin-top:6px">`
    : '';
  window._esSelectedFile=null;
}
export async function saveEditSpecies() {
  const id=document.getElementById('mo-edit-species')._editId;
  const s=await DB().Species.get(id);
  Object.assign(s,{nameRu:v('es-ru').trim(),nameLat:v('es-lat').trim(),code:v('es-code').trim(),synonyms:v('es-syn').trim(),careCode:v('es-care').trim(),type:getChip('es-type')||s.type});
  // Upload photo if selected
  if(window._esSelectedFile) {
    try {
      const path = await DB().Photos.uploadSpeciesPhoto(window._esSelectedFile, id);
      s.photoPath = path;
      window._esSelectedFile = null;
    } catch(e) { console.warn('Species photo upload failed:', e); }
  }
  await DB().Species.save(s); closeModal('mo-edit-species'); renderSpecies();
}
export async function deleteSpecies() {
  const id=document.getElementById('mo-edit-species')._editId;
  const plants=await DB().Plants.bySpecies(id);
  if(plants.length>0&&!confirm(`В этом виде ${plants.length} растений. Удалить всё?`)) return;
  await Promise.all(plants.map(p=>DB().Plants.delete(p.id)));
  await DB().Species.delete(id); closeModal('mo-edit-species'); renderSpecies();
}

// ── Species list ──────────────────────────────────────────────────────────────
export async function openSpeciesList(speciesId) {
  const s=await DB().Species.get(speciesId);
  document.getElementById('mo-species-title').textContent=s?.nameRu||'';
  document.getElementById('mo-species')._speciesId=speciesId;
  document.getElementById('mo-species').classList.add('open');
  stack.push('mo-species');
  renderPlants(speciesId);
}

// ── Plants ────────────────────────────────────────────────────────────────────
async function _lsOpts(sel='') {
  const all=await DB().Landscapes.all();
  return `<option value="">— выбрать —</option>`+all.map(l=>`<option value="${l.id}" ${l.id===sel?'selected':''}>${l.name} (${l.code})</option>`).join('');
}
async function _potOpts(sel='') {
  const all=await DB().Pots.all();
  return `<option value="">— выбрать —</option>`+all.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${p.code}</option>`).join('');
}

async function _fillAddPlant(speciesId) {
  const s=await DB().Species.get(speciesId);
  const ex=await DB().Plants.bySpecies(speciesId);
  const next=ex.length>0?Math.max(...ex.map(p=>p.number))+1:1;
  document.getElementById('mo-add-plant')._speciesId=speciesId;
  document.getElementById('ap-title').textContent=`Добавить: ${s?.nameRu||''}`;
  sv('ap-num',next);
  document.getElementById('ap-preview').textContent=`Код: ${s?.code||''}${String(next).padStart(2,'0')}`;
  document.getElementById('ap-num').oninput=()=>{document.getElementById('ap-preview').textContent=`Код: ${s?.code||''}${String(v('ap-num')).padStart(2,'0')}`;};
  setChip('ap-status','°'); setChips('ap-flags',[]);
  sv('ap-care','');sv('ap-date','');sv('ap-variety','');sv('ap-country','');sv('ap-price','');sv('ap-qty','1');sv('ap-comment','');
  document.getElementById('ap-ls').innerHTML=await _lsOpts();
  document.getElementById('ap-pot').innerHTML=await _potOpts();
  document.getElementById('ap-style').innerHTML=`<option value="">— не выбран —</option>${styleOpts()}`;
}
export async function saveAddPlant() {
  const sid=document.getElementById('mo-add-plant')._speciesId;
  const style=v('ap-style')==='Другой'?v('ap-style-other'):v('ap-style');
  await DB().Plants.save({speciesId:sid,number:parseInt(v('ap-num'))||1,status:getChip('ap-status')||'°',checkFlags:getChips('ap-flags'),shortCare:v('ap-care'),origin:getChip('ap-origin')||'',bonsaiStyle:style,dateStart:v('ap-date'),landscapeId:v('ap-ls'),potId:v('ap-pot'),variety:v('ap-variety'),country:v('ap-country'),price:parseFloat(v('ap-price'))||0,qty:parseInt(v('ap-qty'))||1,comment:v('ap-comment'),photoIds:[],mainPhotoId:null,history:[]});
  closeModal('mo-add-plant'); renderPlants(sid); renderSpecies();
}
async function _fillEditPlant(plantId) {
  const p=await DB().Plants.get(plantId);
  document.getElementById('mo-edit-plant')._plantId=plantId;
  setChip('ep-status',p.status||'°'); setChips('ep-flags',p.checkFlags||[]);
  sv('ep-care',p.shortCare);sv('ep-date',p.dateStart);sv('ep-variety',p.variety);sv('ep-country',p.country);sv('ep-price',p.price);sv('ep-qty',p.qty);sv('ep-comment',p.comment);
  setChip('ep-origin',p.origin||'');
  document.getElementById('ep-ls').innerHTML=await _lsOpts(p.landscapeId);
  document.getElementById('ep-pot').innerHTML=await _potOpts(p.potId);
  document.getElementById('ep-style').innerHTML=`<option value="">— не выбран —</option>${styleOpts(p.bonsaiStyle)}`;
  document.getElementById('ep-style-other-wrap').style.display=p.bonsaiStyle==='Другой'?'':'none';
}
export async function saveEditPlant() {
  const id=document.getElementById('mo-edit-plant')._plantId;
  const p=await DB().Plants.get(id);
  const style=v('ep-style')==='Другой'?v('ep-style-other'):v('ep-style');
  Object.assign(p,{status:getChip('ep-status')||p.status,checkFlags:getChips('ep-flags'),shortCare:v('ep-care'),origin:getChip('ep-origin')||p.origin,bonsaiStyle:style,dateStart:v('ep-date'),landscapeId:v('ep-ls'),potId:v('ep-pot'),variety:v('ep-variety'),country:v('ep-country'),price:parseFloat(v('ep-price'))||0,qty:parseInt(v('ep-qty'))||1,comment:v('ep-comment')});
  await DB().Plants.save(p); closeModal('mo-edit-plant'); renderPlantDetail(id);
  const sid=document.getElementById('mo-species')._speciesId; if(sid) renderPlants(sid);
}
export async function deletePlant(plantId) {
  if(!confirm('Удалить растение?')) return;
  await DB().Plants.delete(plantId); closeModal('mo-plant');
  document.getElementById('fab').style.display='flex';
  const sid=document.getElementById('mo-species')._speciesId; if(sid) renderPlants(sid);
  renderSpecies();
}
export async function clonePlant(plantId) {
  const p=await DB().Plants.get(plantId);
  const ex=await DB().Plants.bySpecies(p.speciesId);
  const next=Math.max(...ex.map(x=>x.number))+1;
  const clone=JSON.parse(JSON.stringify(p));
  delete clone.id; clone.number=next; clone.photoIds=[]; clone.mainPhotoId=null; clone.status='°';
  await DB().Plants.save(clone); closeModal('mo-plant');
  document.getElementById('fab').style.display='flex'; renderPlants(p.speciesId);
}

// ── Plant detail ──────────────────────────────────────────────────────────────
export async function openPlantDetail(plantId) {
  document.getElementById('mo-plant')._plantId=plantId;
  document.getElementById('mo-plant').classList.add('open');
  stack.push('mo-plant');
  document.getElementById('fab').style.display='none';
  document.querySelectorAll('.itab').forEach((t,i)=>t.classList.toggle('on',i===0));
  document.querySelectorAll('.itab-body').forEach((b,i)=>b.classList.toggle('on',i===0));
  await renderPlantDetail(plantId);
}
export function switchItab(idx) {
  document.querySelectorAll('.itab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  document.querySelectorAll('.itab-body').forEach((b,i)=>b.classList.toggle('on',i===idx));
}

// ── Photos ────────────────────────────────────────────────────────────────────
let _selectedFile = null;
function _fillPhoto(plantId) {
  document.getElementById('mo-photo')._plantId=plantId;
  sv('ph-date',new Date().toISOString().split('T')[0]); sv('ph-note','');
  document.getElementById('ph-preview').innerHTML='';
  _selectedFile=null;
  const btn=document.getElementById('ph-save-btn'); if(btn){btn.disabled=true;btn.style.opacity='.5';}
}
export function handleSpeciesPhotoFile(e) {
  const file=e.target.files[0]; if(!file) return;
  window._esSelectedFile=file;
  const url=URL.createObjectURL(file);
  const prev=document.getElementById('es-photo-preview');
  if(prev) prev.innerHTML=`<img src="${url}" style="width:100%;max-height:150px;object-fit:cover;border-radius:6px;margin-top:6px" onload="URL.revokeObjectURL(this.src)">`;
}

export function handlePhotoFile(e, previewId) {
  const file=e.target.files[0]; if(!file) return;
  _selectedFile=file;
  const url=URL.createObjectURL(file);
  const prev=document.getElementById(previewId);
  if(prev) prev.innerHTML=`<img src="${url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--ash);margin-top:8px" onload="URL.revokeObjectURL(this.src)">`;
  const btn=document.getElementById('ph-save-btn'); if(btn){btn.disabled=false;btn.style.opacity='1';}
}
export async function savePhoto() {
  const plantId=document.getElementById('mo-photo')._plantId;
  if(!_selectedFile) return alert('Выберите фото');
  try {
    const photoId=await DB().Photos.upload(_selectedFile,plantId,{date:v('ph-date'),note:v('ph-note')});
    const plant=await DB().Plants.get(plantId);
    plant.photoIds=plant.photoIds||[];
    plant.photoIds.push(photoId);
    if(!plant.mainPhotoId) plant.mainPhotoId=photoId;
    await DB().Plants.save(plant);
    _selectedFile=null;
    closeModal('mo-photo');
    renderPlantDetail(plantId);
    switchItab(1);
  } catch(err) { alert('Ошибка загрузки: '+err.message); }
}
export async function setMainPhoto(plantId, photoId) {
  const p=await DB().Plants.get(plantId); p.mainPhotoId=photoId;
  await DB().Plants.save(p); renderPlantDetail(plantId); switchItab(1);
}
export async function deletePhoto(plantId, photoId) {
  if(!confirm('Удалить фото?')) return;
  await DB().Photos.delete(photoId);
  const p=await DB().Plants.get(plantId);
  p.photoIds=(p.photoIds||[]).filter(id=>id!==photoId);
  if(p.mainPhotoId===photoId) p.mainPhotoId=p.photoIds[0]||null;
  await DB().Plants.save(p); renderPlantDetail(plantId); switchItab(1);
}

// ── History ───────────────────────────────────────────────────────────────────
async function _fillHistory(plantId, histId) {
  const modal=document.getElementById('mo-history');
  modal._plantId=plantId; modal._histId=histId||null;
  const isEdit=!!histId;
  document.getElementById('mo-history-title').textContent=isEdit?'Редактировать запись':'Запись в историю';
  document.getElementById('h-delete-btn').style.display=isEdit?'':'none';
  document.getElementById('h-save-btn').textContent=isEdit?'💾 Обновить':'Сохранить';
  _selectedFile=null;
  document.getElementById('h-preview').innerHTML='';
  if(isEdit) {
    const plant=await DB().Plants.get(plantId);
    const entry=(plant.history||[]).find(h=>h.id===histId);
    if(entry){sv('h-title',entry.title);sv('h-date',entry.date);sv('h-comment',entry.comment);}
  } else {
    sv('h-title','');sv('h-date',new Date().toISOString().split('T')[0]);sv('h-comment','');
  }
  const all=await DB().Plants.all();
  const titles=[...new Set(all.flatMap(p=>(p.history||[]).map(h=>h.title)))].filter(Boolean);
  document.getElementById('h-suggestions').innerHTML=titles.slice(0,8).map(t=>`<button class="chip chip-sm" onclick="document.getElementById('h-title').value='${t}'">${t}</button>`).join('');
}
export async function saveHistory() {
  const modal=document.getElementById('mo-history');
  const plantId=modal._plantId, histId=modal._histId;
  const title=v('h-title').trim(); if(!title) return alert('Введите название');
  const plant=await DB().Plants.get(plantId);
  if(!plant.history) plant.history=[];
  const entry={id:histId||'h_'+Date.now(),date:v('h-date'),title,comment:v('h-comment').trim()};
  if(_selectedFile) {
    try { await DB().Photos.upload(_selectedFile,plantId,{date:v('h-date'),note:title}); _selectedFile=null; } catch(e){}
  }
  if(histId) { const i=plant.history.findIndex(h=>h.id===histId); if(i!==-1) plant.history[i]=entry; }
  else plant.history.push(entry);
  await DB().Plants.save(plant); closeModal('mo-history'); renderPlantDetail(plantId); switchItab(2);
}
export async function deleteHistory() {
  const modal=document.getElementById('mo-history');
  if(!confirm('Удалить запись?')) return;
  const plant=await DB().Plants.get(modal._plantId);
  plant.history=(plant.history||[]).filter(h=>h.id!==modal._histId);
  await DB().Plants.save(plant); closeModal('mo-history'); renderPlantDetail(modal._plantId); switchItab(2);
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
async function _fillAddTask(plantId) {
  const [allS,allP]=await Promise.all([DB().Species.all(),DB().Plants.all()]);
  const select = document.getElementById('at-target');
  select.innerHTML='<option value="">— выбрать —</option>'+
    allS.map(s=>`<option value="${s.id}">[Вид] ${s.nameRu}</option>`).join('')+
    allP.map(p=>{const s=allS.find(x=>x.id===p.speciesId);return `<option value="${p.id}">[Растение] ${s?.code||''}${String(p.number).padStart(2,'0')}</option>`;}).join('');
  // Pre-select plant if provided
  if (plantId) select.value = plantId;
}
export async function saveAddTask() {
  const name=v('at-name').trim(); if(!name) return alert('Введите название');
  const targetId=v('at-target');
  const allS=await DB().Species.all();
  const type=allS.find(s=>s.id===targetId)?'species':'plant';
  await DB().Tasks.save({name,type,targetId,date:v('at-date'),comment:v('at-comment').trim(),done:false});
  closeModal('mo-add-task'); renderDeals(); updateBadge();
}
export async function completeTask(taskId, plantId) {
  const task=await DB().Tasks.get(taskId); if(!task) return;
  if(task.type==='plant'&&task.targetId) {
    const p=await DB().Plants.get(task.targetId);
    if(p){if(!p.history)p.history=[];p.history.push({id:'h_'+Date.now(),date:new Date().toISOString().split('T')[0],title:task.name,comment:task.comment||''});await DB().Plants.save(p);}
  }
  task.done=true; await DB().Tasks.save(task); updateBadge();
  if(plantId) renderPlantDetail(plantId); renderDeals();
}

// ── Landscapes ────────────────────────────────────────────────────────────────
export async function saveAddLs() {
  const name=v('al-name').trim(),code=v('al-code').trim(); if(!name||!code) return alert('Заполните название и код');
  await DB().Landscapes.save({name,code,light:getChip('al-light')||'☀️',tempMin:v('al-tmin'),tempMax:v('al-tmax'),humidity:getChip('al-hum')||'≈',locations:[]});
  closeModal('mo-add-ls'); renderLandscapes();
}
async function _fillEditLs(id) {
  const l=await DB().Landscapes.get(id);
  document.getElementById('mo-edit-ls')._editId=id;
  sv('el-name',l.name);sv('el-code',l.code);sv('el-tmin',l.tempMin);sv('el-tmax',l.tempMax);
  setChip('el-light',l.light||'☀️'); setChip('el-hum',l.humidity||'≈');
}
export async function saveEditLs() {
  const id=document.getElementById('mo-edit-ls')._editId;
  const l=await DB().Landscapes.get(id);
  Object.assign(l,{name:v('el-name').trim(),code:v('el-code').trim(),light:getChip('el-light')||l.light,tempMin:v('el-tmin'),tempMax:v('el-tmax'),humidity:getChip('el-hum')||l.humidity});
  await DB().Landscapes.save(l); closeModal('mo-edit-ls'); renderLandscapes();
}
export async function deleteLs() {
  if(!confirm('Удалить ландшафт?')) return;
  await DB().Landscapes.delete(document.getElementById('mo-edit-ls')._editId);
  closeModal('mo-edit-ls'); renderLandscapes();
}
export async function addLocation(lsId) {
  const name=prompt('Название локации:'); if(!name) return;
  const code=prompt('Код локации:'); if(!code) return;
  const l=await DB().Landscapes.get(lsId);
  l.locations=l.locations||[]; l.locations.push({id:'loc_'+Date.now(),name,code});
  await DB().Landscapes.save(l); renderLandscapes();
}

// ── Pots ─────────────────────────────────────────────────────────────────────
const MAT={PL:'Пластик',CL:'Глина',CR:'Керамика',CN:'Бетон',FB:'Ткань',WD:'Дерево',MT:'Металл'};
const potCode=(m,n,sh,pr,sz,c,p)=>`POT.${m}${String(n).padStart(3,'0')}.${sh}${pr}.${sz}.${c}${p}`;

function _fillAddPot(mat='PL') {
  setChip('ap2-mat',mat); setChip('ap2-prop','='); setChip('ap2-size','M'); setChip('ap2-pattern','');
  sv('ap2-num','001'); window._updateAddPotCode();
}
window._updateAddPotCode=()=>{
  const el=document.getElementById('ap2-code-preview');
  if(el) el.textContent=`Код: ${potCode(getChip('ap2-mat')||'PL',v('ap2-num')||'001',getChip('ap2-shape')||'RD',getChip('ap2-prop')||'=',getChip('ap2-size')||'M',getChip('ap2-color')||'BK',getChip('ap2-pattern')||'')}`;
};
export async function saveAddPot() {
  const m=getChip('ap2-mat')||'PL',n=v('ap2-num')||'001',sh=getChip('ap2-shape'),pr=getChip('ap2-prop')||'=',sz=getChip('ap2-size')||'M',c=getChip('ap2-color'),p=getChip('ap2-pattern')||'';
  if(!sh||!c) return alert('Выберите форму и цвет');
  await DB().Pots.save({material:m,mat_name:MAT[m]||m,number:n,shape:sh,prop:pr,size:sz,color:c,pattern:p,code:potCode(m,n,sh,pr,sz,c,p)});
  closeModal('mo-add-pot'); renderPots();
}
async function _fillEditPot(id) {
  const p=await DB().Pots.get(id);
  document.getElementById('mo-edit-pot')._editId=id;
  document.getElementById('ep2-current').textContent=p.code;
  setChip('ep2-mat',p.material);setChip('ep2-shape',p.shape);setChip('ep2-prop',p.prop||'=');
  setChip('ep2-size',p.size);setChip('ep2-color',p.color);setChip('ep2-pattern',p.pattern||'');
  sv('ep2-num',p.number); window._updateEditPotCode();
}
window._updateEditPotCode=()=>{
  const el=document.getElementById('ep2-new-code');
  if(el) el.textContent=`Новый код: ${potCode(getChip('ep2-mat')||'PL',v('ep2-num')||'001',getChip('ep2-shape')||'RD',getChip('ep2-prop')||'=',getChip('ep2-size')||'M',getChip('ep2-color')||'BK',getChip('ep2-pattern')||'')}`;
};
export async function saveEditPot() {
  const id=document.getElementById('mo-edit-pot')._editId;
  const p=await DB().Pots.get(id);
  const m=getChip('ep2-mat')||p.material,n=v('ep2-num')||p.number,sh=getChip('ep2-shape')||p.shape,pr=getChip('ep2-prop')||p.prop,sz=getChip('ep2-size')||p.size,c=getChip('ep2-color')||p.color,pt=getChip('ep2-pattern')!==''?getChip('ep2-pattern'):p.pattern;
  Object.assign(p,{material:m,mat_name:MAT[m]||m,number:n,shape:sh,prop:pr,size:sz,color:c,pattern:pt,code:potCode(m,n,sh,pr,sz,c,pt)});
  await DB().Pots.save(p); closeModal('mo-edit-pot'); renderPots();
}
export async function deletePot() {
  if(!confirm('Удалить горшок?')) return;
  await DB().Pots.delete(document.getElementById('mo-edit-pot')._editId);
  closeModal('mo-edit-pot'); renderPots();
}

// ── Navigation ────────────────────────────────────────────────────────────────
export async function editPhotoMeta(photoId, plantId) {
  const modal = document.getElementById('mo-edit-photo');
  modal._photoId = photoId;
  modal._plantId = plantId;
  const ph = await DB().Photos.get(photoId);
  if (ph) {
    document.getElementById('ep-photo-date').value = ph.date || '';
    document.getElementById('ep-photo-note').value = ph.note || '';
  }
  openModal('mo-edit-photo');
}

export async function savePhotoMeta() {
  const modal = document.getElementById('mo-edit-photo');
  const photoId = modal._photoId;
  const plantId = modal._plantId;
  await DB().Photos.update(photoId, {
    date: document.getElementById('ep-photo-date').value,
    note: document.getElementById('ep-photo-note').value.trim()
  });
  closeModal('mo-edit-photo');
  const plant = await DB().Plants.get(plantId);
  const { renderPhotosTab } = await import('./render.js');
  await renderPhotosTab(plant);
  switchItab(1);
}

// ── Regular Actions ──────────────────────────────────────────────────────────
export async function saveAddRegularAction() {
  const modal = document.getElementById('mo-add-ra');
  const plantId = modal._plantId;
  const name = document.getElementById('ra-name').value.trim();
  const period = parseInt(document.getElementById('ra-period').value) || 7;
  const nextDate = document.getElementById('ra-next-date').value;
  if (!name) return alert('Введите название');
  await DB().RegularActions.save({
    plantId,
    name,
    periodDays: period,
    nextDate: nextDate || null
  });
  closeModal('mo-add-ra');
  const plant = await DB().Plants.get(plantId);
  const { renderHistoryTab } = await import('./render.js');
  await renderHistoryTab(plant);
  const { renderDeals, updateBadge } = await import('./render.js');
  await renderDeals();
  await updateBadge();
}

export async function editRegularAction(raId, plantId) {
  const modal = document.getElementById('mo-edit-ra');
  modal._raId = raId;
  modal._plantId = plantId;
  const ra = await DB().RegularActions.all().then(all => all.find(r => r.id === raId));
  if (ra) {
    document.getElementById('era-name').value = ra.name || '';
    document.getElementById('era-period').value = ra.periodDays || 7;
    document.getElementById('era-next-date').value = ra.nextDate || '';
  }
  openModal('mo-edit-ra');
}

export async function saveEditRegularAction() {
  const modal = document.getElementById('mo-edit-ra');
  const raId = modal._raId;
  const plantId = modal._plantId;
  const name = document.getElementById('era-name').value.trim();
  const period = parseInt(document.getElementById('era-period').value) || 7;
  const nextDate = document.getElementById('era-next-date').value;
  if (!name) return alert('Введите название');
  const ra = await DB().RegularActions.all().then(all => all.find(r => r.id === raId));
  await DB().RegularActions.save({ ...ra, name, periodDays: period, nextDate: nextDate || null });
  closeModal('mo-edit-ra');
  const plant = await DB().Plants.get(plantId);
  const { renderHistoryTab, renderDeals, updateBadge } = await import('./render.js');
  await renderHistoryTab(plant);
  await renderDeals();
  await updateBadge();
}

export async function deleteRegularAction() {
  const modal = document.getElementById('mo-edit-ra');
  if (!confirm('Удалить регулярное действие?')) return;
  await DB().RegularActions.delete(modal._raId);
  closeModal('mo-edit-ra');
  const plant = await DB().Plants.get(modal._plantId);
  const { renderHistoryTab, renderDeals, updateBadge } = await import('./render.js');
  await renderHistoryTab(plant);
  await renderDeals();
  await updateBadge();
}

export async function completeRegularAction(raId, plantId) {
  const today = new Date().toISOString().split('T')[0];
  const nextDate = await DB().RegularActions.complete(raId, today);

  // Add to plant history
  const ra = await DB().RegularActions.all().then(all => all.find(r => r.id === raId));
  if (ra && ra.plantId) {
    const plant = await DB().Plants.get(ra.plantId);
    if (plant) {
      if (!plant.history) plant.history = [];
      plant.history.push({
        id: 'h_' + Date.now(),
        date: today,
        title: ra.name,
        comment: `Регулярное действие. Следующее: ${nextDate}`,
        type: 'regular'
      });
      await DB().Plants.save(plant);
    }
  }

  const { renderDeals, updateBadge } = await import('./render.js');
  await renderDeals();
  await updateBadge();

  // Refresh plant history if open
  if (plantId || ra?.plantId) {
    const pid = plantId || ra.plantId;
    const plant = await DB().Plants.get(pid);
    const { renderHistoryTab } = await import('./render.js');
    await renderHistoryTab(plant);
  }
}

export function goToLandscape(id) {
  closeModal('mo-plant'); document.getElementById('fab').style.display='flex';
  window.switchTab('landscapes');
  setTimeout(()=>document.querySelector(`[data-ls-id="${id}"]`)?.scrollIntoView({behavior:'smooth'}),300);
}
export function goToPot(id) {
  closeModal('mo-plant'); document.getElementById('fab').style.display='flex';
  window.switchTab('pots');
  setTimeout(()=>document.querySelector(`[data-pot-id="${id}"]`)?.scrollIntoView({behavior:'smooth'}),300);
}
