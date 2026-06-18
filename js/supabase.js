// supabase.js — Supabase backend for Gideon Bonsai
// Ключи хранятся в js/config.js — редактируйте только его!
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const PHOTO_BUCKET = 'photos';

// ── Init ──────────────────────────────────────────────────────────────────────
let _sb = null;

export async function initSupabase() {
  if (_sb) return _sb;
  // Load Supabase JS from CDN
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });
  return _sb;
}

function sb() {
  if (!_sb) throw new Error('Supabase не инициализирован');
  return _sb;
}

// Expose for direct use in modals
export function getSB() { return _sb; }

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://ggideonbonsai.github.io/GgideonBonsai/'
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await sb().auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await sb().auth.getUser();
  return user;
}

export async function onAuthChange(callback) {
  sb().auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

// ── Species ───────────────────────────────────────────────────────────────────
export const SBSpecies = {
  async all() {
    const { data, error } = await sb().from('species').select('*').order('name_ru');
    if (error) throw error;
    return data.map(_fromDB_species);
  },
  async get(id) {
    const { data, error } = await sb().from('species').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return _fromDB_species(data);
  },
  async save(obj) {
    const user = await getUser();
    const row = { ..._toDB_species(obj), user_id: user?.id };
    if (obj.id) {
      const { data, error } = await sb().from('species').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return _fromDB_species(data);
    } else {
      const { data, error } = await sb().from('species').insert(row).select().single();
      if (error) throw error;
      return _fromDB_species(data);
    }
  },
  async delete(id) {
    const user = await getUser();
    if (!user?.id) throw new Error('Не авторизован');
    // Move to trash first
    const { data } = await sb().from('species').select('*').eq('id', id).maybeSingle();
    if (data) {
      const { error: trashErr } = await sb().from('trash').insert({ user_id: user.id, type: 'species', data });
      if (trashErr) console.warn('Trash insert error:', trashErr);
    }
    const { error } = await sb().from('species').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── Plants ────────────────────────────────────────────────────────────────────
export const SBPlants = {
  async all() {
    const { data, error } = await sb().from('plants').select('*');
    if (error) throw error;
    return data.map(_fromDB_plant);
  },
  async get(id) {
    const { data, error } = await sb().from('plants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return _fromDB_plant(data);
  },
  async bySpecies(speciesId) {
    const { data, error } = await sb().from('plants').select('*').eq('species_id', speciesId).order('number');
    if (error) throw error;
    return data.map(_fromDB_plant);
  },
  async save(obj) {
    const user = await getUser();
    const row = { ..._toDB_plant(obj), user_id: user?.id };
    if (obj.id) {
      const { data, error } = await sb().from('plants').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return _fromDB_plant(data);
    } else {
      const { data, error } = await sb().from('plants').insert(row).select().single();
      if (error) throw error;
      return _fromDB_plant(data);
    }
  },
  async delete(id) {
    const { data } = await sb().from('plants').select('*').eq('id', id).single();
    if (data) {
      const user = await getUser();
      await sb().from('trash').insert({ user_id: user?.id, type: 'plant', data });
    }
    const { error } = await sb().from('plants').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── Landscapes ────────────────────────────────────────────────────────────────
export const SBLandscapes = {
  async all() {
    const { data, error } = await sb().from('landscapes').select('*').order('name');
    if (error) throw error;
    return data.map(_fromDB_landscape);
  },
  async get(id) {
    const { data, error } = await sb().from('landscapes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return _fromDB_landscape(data);
  },
  async save(obj) {
    const user = await getUser();
    const row = { ..._toDB_landscape(obj), user_id: user?.id };
    if (obj.id) {
      const { data, error } = await sb().from('landscapes').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return _fromDB_landscape(data);
    } else {
      const { data, error } = await sb().from('landscapes').insert(row).select().single();
      if (error) throw error;
      return _fromDB_landscape(data);
    }
  },
  async delete(id) {
    const { data } = await sb().from('landscapes').select('*').eq('id', id).single();
    if (data) {
      const user = await getUser();
      await sb().from('trash').insert({ user_id: user?.id, type: 'landscape', data });
    }
    const { error } = await sb().from('landscapes').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── Pots ─────────────────────────────────────────────────────────────────────
export const SBPots = {
  async all() {
    const { data, error } = await sb().from('pots').select('*').order('code');
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await sb().from('pots').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async save(obj) {
    const user = await getUser();
    const row = { ...obj, user_id: user?.id };
    if (obj.id) {
      const { data, error } = await sb().from('pots').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await sb().from('pots').insert(row).select().single();
      if (error) throw error;
      return data;
    }
  },
  async delete(id) {
    const { data } = await sb().from('pots').select('*').eq('id', id).single();
    if (data) {
      const user = await getUser();
      await sb().from('trash').insert({ user_id: user?.id, type: 'pot', data });
    }
    const { error } = await sb().from('pots').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const SBTasks = {
  async all() {
    const { data, error } = await sb().from('tasks').select('*').order('date');
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await sb().from('tasks').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? { ...data, targetId: data.target_id } : null;
  },
  async pending() {
    const { data, error } = await sb().from('tasks').select('*').eq('done', false).order('date');
    if (error) throw error;
    return data;
  },
  async forPlant(plantId) {
    const { data, error } = await sb().from('tasks').select('*').eq('target_id', plantId).eq('done', false);
    if (error) throw error;
    return data;
  },
  async save(obj) {
    const user = await getUser();
    const row = { ...obj, target_id: obj.targetId, user_id: user?.id };
    delete row.targetId;
    if (obj.id) {
      const { data, error } = await sb().from('tasks').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return { ...data, targetId: data.target_id };
    } else {
      const { data, error } = await sb().from('tasks').insert(row).select().single();
      if (error) throw error;
      return { ...data, targetId: data.target_id };
    }
  },
  async delete(id) {
    const { error } = await sb().from('tasks').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── Regular Actions ──────────────────────────────────────────────────────────
export const SBRegularActions = {
  async all() {
    const { data, error } = await sb().from('regular_actions').select('*').order('next_date');
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await sb().from('regular_actions').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return _fromDB_ra(data);
  },
  async forPlant(plantId) {
    const { data, error } = await sb().from('regular_actions').select('*').eq('plant_id', plantId).order('next_date');
    if (error) throw error;
    return data.map(_fromDB_ra);
  },
  async pending() {
    const { data, error } = await sb().from('regular_actions').select('*').order('next_date');
    if (error) throw error;
    return data;
  },
  async save(obj) {
    const user = await getUser();
    const row = {
      user_id: user?.id,
      plant_id: obj.plantId,
      name: obj.name,
      period_days: obj.periodDays || 7,
      next_date: obj.nextDate || null,
      last_done: obj.lastDone || null
    };
    if (obj.id) {
      const { data, error } = await sb().from('regular_actions').update(row).eq('id', obj.id).select().single();
      if (error) throw error;
      return _fromDB_ra(data);
    } else {
      const { data, error } = await sb().from('regular_actions').insert(row).select().single();
      if (error) throw error;
      return _fromDB_ra(data);
    }
  },
  async complete(id, doneDate) {
    // Calculate next date from done date + period
    const { data: ra } = await sb().from('regular_actions').select('*').eq('id', id).single();
    if (!ra) return;
    const done = new Date(doneDate);
    const next = new Date(done);
    next.setDate(next.getDate() + ra.period_days);
    const nextStr = next.toISOString().split('T')[0];
    const { error } = await sb().from('regular_actions').update({
      last_done: doneDate,
      next_date: nextStr
    }).eq('id', id);
    if (error) throw error;
    return nextStr;
  },
  async delete(id) {
    const { error } = await sb().from('regular_actions').delete().eq('id', id);
    if (error) throw error;
  }
};

function _fromDB_ra(r) {
  return { id: r.id, plantId: r.plant_id, name: r.name, periodDays: r.period_days, nextDate: r.next_date, lastDone: r.last_done };
}

// ── Trash ────────────────────────────────────────────────────────────────────
export const SBTrash = {
  async all() {
    const { data, error } = await sb().from('trash').select('*').order('deleted_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async add(type, data) {
    const user = await getUser();
    const { error } = await sb().from('trash').insert({ user_id: user?.id, type, data });
    if (error) throw error;
  },
  async restore(id) {
    const { data, error } = await sb().from('trash').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await sb().from('trash').delete().eq('id', id);
    if (error) throw error;
  },
  async clear() {
    const user = await getUser();
    if (!user?.id) throw new Error('Не авторизован');
    const { error } = await sb().from('trash').delete().neq('id', '00000000-0000-0000-0000-000000000000').eq('user_id', user.id);
    if (error) throw error;
  }
};

// ── Photos (Supabase Storage) ─────────────────────────────────────────────────
export const SBPhotos = {
  async upload(file, plantId, meta = {}) {
    const user = await getUser();
    if (!user) throw new Error('Не авторизован');

    // Resize if > 2MB
    const blob = file.size > 2 * 1024 * 1024 ? await _resize(file, 1200) : file;
    const path = `${user.id}/${plantId}/${Date.now()}.jpg`;

    const { error: upErr } = await sb().storage.from(PHOTO_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg', upsert: false
    });
    if (upErr) throw upErr;

    // Save photo record
    const { data, error } = await sb().from('photos').insert({
      user_id: user.id,
      plant_id: plantId,
      storage_path: path,
      date: meta.date || new Date().toISOString().split('T')[0],
      note: meta.note || ''
    }).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Фото не сохранено');

    return data[0].id;
  },

  getURL(storagePath) {
    const { data } = sb().storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl || null;
  },

  async getSignedURL(storagePath) {
    const { data, error } = await sb().storage.from(PHOTO_BUCKET).createSignedUrl(storagePath, 3600);
    if (error) return null;
    return data.signedUrl;
  },

  async get(photoId) {
    const { data, error } = await sb().from('photos').select('*').eq('id', photoId).maybeSingle();
    if (error) return null;
    return data;
  },

  async forPlant(plantId) {
    const { data, error } = await sb().from('photos').select('*').eq('plant_id', plantId).order('date');
    if (error) return [];
    return data;
  },

  async update(photoId, meta) {
    const { error } = await sb().from('photos').update({
      date: meta.date || null,
      note: meta.note || ''
    }).eq('id', photoId);
    if (error) throw error;
  },

  async delete(photoId) {
    const ph = await this.get(photoId);
    if (ph?.storage_path) {
      await sb().storage.from(PHOTO_BUCKET).remove([ph.storage_path]);
    }
    await sb().from('photos').delete().eq('id', photoId);
  },

  async uploadSpeciesPhoto(file, speciesId) {
    const user = await getUser();
    if (!user) throw new Error('Not logged in');
    const blob = file.size > 2 * 1024 * 1024 ? await _resize(file, 1200) : file;
    const path = `${user.id}/species/${speciesId}/${Date.now()}.jpg`;
    const { error: upErr } = await sb().storage.from(PHOTO_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg', upsert: true
    });
    if (upErr) throw upErr;
    return path;
  }
};

// ── Field mappers ─────────────────────────────────────────────────────────────
function _fromDB_species(r) {
  return { id: r.id, nameRu: r.name_ru, nameLat: r.name_lat, code: r.code, type: r.type, synonyms: r.synonyms, careCode: r.care_code, photoPath: r.photo_path || null };
}
function _toDB_species(o) {
  return { name_ru: o.nameRu, name_lat: o.nameLat, code: o.code, type: o.type, synonyms: o.synonyms, care_code: o.careCode, photo_path: o.photoPath || null };
}

function _fromDB_plant(r) {
  return {
    id: r.id, speciesId: r.species_id, number: r.number,
    status: r.status, checkFlags: r.check_flags || [],
    shortCare: r.short_care, origin: r.origin,
    bonsaiStyle: r.bonsai_style, dateStart: r.date_start,
    landscapeId: r.landscape_id, potId: r.pot_id,
    variety: r.variety, country: r.country,
    price: r.price, qty: r.qty, comment: r.comment,
    mainPhotoId: r.main_photo_id,
    photoIds: r.photo_ids || [],
    history: r.history || []
  };
}
function _toDB_plant(o) {
  const nullIfEmpty = v => (v === '' || v === undefined) ? null : v;
  return {
    species_id: o.speciesId, number: o.number || 1,
    status: o.status || '°', check_flags: o.checkFlags || [],
    short_care: nullIfEmpty(o.shortCare), origin: nullIfEmpty(o.origin),
    bonsai_style: nullIfEmpty(o.bonsaiStyle),
    date_start: nullIfEmpty(o.dateStart),
    landscape_id: nullIfEmpty(o.landscapeId),
    pot_id: nullIfEmpty(o.potId),
    variety: nullIfEmpty(o.variety), country: nullIfEmpty(o.country),
    price: o.price || null, qty: o.qty || 1,
    comment: nullIfEmpty(o.comment),
    main_photo_id: nullIfEmpty(o.mainPhotoId),
    photo_ids: o.photoIds || [],
    history: o.history || []
  };
}

function _fromDB_landscape(r) {
  return { id: r.id, name: r.name, code: r.code, light: r.light, tempMin: r.temp_min, tempMax: r.temp_max, humidity: r.humidity, locations: r.locations || [] };
}
function _toDB_landscape(o) {
  return { name: o.name, code: o.code, light: o.light || null,
    temp_min: o.tempMin || null, temp_max: o.tempMax || null,
    humidity: o.humidity || null, locations: o.locations || [] };
}

// ── Image resize ──────────────────────────────────────────────────────────────
function _resize(file, maxSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
        else { width = Math.round(width * maxSize / height); height = maxSize; }
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      c.toBlob(resolve, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}
