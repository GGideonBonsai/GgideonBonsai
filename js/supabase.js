// supabase.js — Supabase backend for Gideon Bonsai
// Replace the two constants below with your project values

export const SUPABASE_URL = 'https://oyimrrwsbleuhdnhfsub.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95aW1ycndzYmxldWhkbmhmc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MjQ3MzYsImV4cCI6MjA5NzIwMDczNn0.tJu6zTqDYFPZDhLh1tN2E0sfYxidRmzvdGxnfPwzkj8';

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
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

function sb() {
  if (!_sb) throw new Error('Supabase не инициализирован');
  return _sb;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await sb().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await sb().auth.signUp({ email, password });
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
    const { data, error } = await sb().from('species').select('*').eq('id', id).single();
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
    const { data, error } = await sb().from('plants').select('*').eq('id', id).single();
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
    const { data, error } = await sb().from('landscapes').select('*').eq('id', id).single();
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
    const { data, error } = await sb().from('pots').select('*').eq('id', id).single();
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
      plant_id: plantId,
      storage_path: path,
      date: meta.date || new Date().toISOString().split('T')[0],
      note: meta.note || ''
    }).select().single();
    if (error) throw error;

    return data.id;
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
    const { data, error } = await sb().from('photos').select('*').eq('id', photoId).single();
    if (error) return null;
    return data;
  },

  async forPlant(plantId) {
    const { data, error } = await sb().from('photos').select('*').eq('plant_id', plantId).order('date');
    if (error) return [];
    return data;
  },

  async delete(photoId) {
    const ph = await this.get(photoId);
    if (ph?.storage_path) {
      await sb().storage.from(PHOTO_BUCKET).remove([ph.storage_path]);
    }
    await sb().from('photos').delete().eq('id', photoId);
  }
};

// ── Field mappers ─────────────────────────────────────────────────────────────
function _fromDB_species(r) {
  return { id: r.id, nameRu: r.name_ru, nameLat: r.name_lat, code: r.code, type: r.type, synonyms: r.synonyms, careCode: r.care_code };
}
function _toDB_species(o) {
  return { name_ru: o.nameRu, name_lat: o.nameLat, code: o.code, type: o.type, synonyms: o.synonyms, care_code: o.careCode };
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
  return {
    species_id: o.speciesId, number: o.number,
    status: o.status, check_flags: o.checkFlags || [],
    short_care: o.shortCare, origin: o.origin,
    bonsai_style: o.bonsaiStyle, date_start: o.dateStart,
    landscape_id: o.landscapeId, pot_id: o.potId,
    variety: o.variety, country: o.country,
    price: o.price, qty: o.qty, comment: o.comment,
    main_photo_id: o.mainPhotoId,
    photo_ids: o.photoIds || [],
    history: o.history || []
  };
}

function _fromDB_landscape(r) {
  return { id: r.id, name: r.name, code: r.code, light: r.light, tempMin: r.temp_min, tempMax: r.temp_max, humidity: r.humidity, locations: r.locations || [] };
}
function _toDB_landscape(o) {
  return { name: o.name, code: o.code, light: o.light, temp_min: o.tempMin, temp_max: o.tempMax, humidity: o.humidity, locations: o.locations || [] };
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
