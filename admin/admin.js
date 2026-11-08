import { SUPABASE_URL, SUPABASE_KEY, IMAGE_BUCKET } from '../assets/js/config.js';
import { optimizeImage } from '../assets/js/image-tools.js';

/* ---------- أدوات صغيرة ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSize = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const imgSrc = (p) => /^https?:\/\//.test(p) ? p : '../' + encodeURI(p);   // صور الريبو القديمة نسبية للجذر
const PUB = `/object/public/${IMAGE_BUCKET}/`;
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1${PUB}${path}`;
const bucketPath = (u) => { const i = (u || '').indexOf(PUB); return i >= 0 ? decodeURIComponent(u.slice(i + PUB.length)) : null; };
const normHex = (h) => {
  h = (h || '').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) return '#' + [...h.slice(1)].map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(h) ? h : '#cccccc';
};
let toastTimer;
function toast(msg, type = '') {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + type;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 3200);
}

/* ---------- الجلسة والـ API ---------- */
const SKEY = 'topone_admin_session';
let session = (() => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } })();
function saveSession(s) {
  if (s) s.expires_at = s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
  session = s;
  try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch { /* تجاهل */ }
}
async function authCall(grant, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error_description || j.msg || j.message || 'فشل تسجيل الدخول');
  return j;
}
async function refresh() {
  try { saveSession(await authCall('refresh_token', { refresh_token: session.refresh_token })); }
  catch { logout(); throw new Error('انتهت الجلسة، سجّل الدخول من جديد'); }
}
async function getToken() {
  if (!session) throw new Error('انتهت الجلسة');
  if (session.expires_at - 60 < Date.now() / 1000) await refresh();
  return session.access_token;
}
async function api(path, { method = 'GET', body, headers = {}, raw = false, retry = true } = {}) {
  const token = await getToken();
  const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, ...headers };
  let payload = body;
  if (body !== undefined && !raw) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(SUPABASE_URL + path, { method, headers: h, body: payload });
  if (res.status === 401 && retry) { await refresh(); return api(path, { method, body, headers, raw, retry: false }); }
  if (!res.ok) {
    let m; try { const j = await res.json(); m = j.message || j.error || j.msg; } catch { /* */ }
    throw new Error(m || `خطأ ${res.status}`);
  }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

/* ---------- الحالة ---------- */
let categories = [], products = [], ed = null;

function show(view) {
  $('#login-view').hidden = view !== 'login';
  $('#app-view').hidden = view !== 'app';
}
function logout() { saveSession(null); show('login'); }
const catName = (id) => categories.find(c => c.id === id)?.name || 'بدون تصنيف';

async function loadData() {
  [categories, products] = await Promise.all([
    api('/rest/v1/categories?select=*&order=sort_order.asc'),
    api('/rest/v1/products?select=*&order=sort_order.asc,id.desc'),
  ]);
  renderFilters(); renderProducts(); renderCategories();
}

/* ---------- الدخول ---------- */
async function enter() {
  const rows = await api('/rest/v1/admins?select=user_id');
  if (!rows.length) { logout(); throw new Error('هذا الحساب غير مصرّح له بالإدارة'); }
  await loadData(); show('app');
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error'), btn = $('#login-btn'); err.hidden = true; btn.disabled = true;
  try {
    saveSession(await authCall('password', { email: $('#email').value.trim(), password: $('#password').value }));
    await enter();
  } catch (ex) {
    err.textContent = /invalid login/i.test(ex.message) ? 'الإيميل أو كلمة المرور غير صحيحة' : ex.message;
    err.hidden = false;
  } finally { btn.disabled = false; }
});
$('#logout').addEventListener('click', logout);

/* ---------- تبويبات ---------- */
$$('.tab').forEach(b => b.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === b));
  $('#panel-products').hidden = b.dataset.tab !== 'products';
  $('#panel-categories').hidden = b.dataset.tab !== 'categories';
}));

/* ---------- قائمة المنتجات ---------- */
function renderFilters() {
  const keep = $('#filter-cat').value;
  $('#filter-cat').innerHTML = '<option value="">كل التصنيفات</option>' +
    categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('') +
    '<option value="__none">بدون تصنيف</option>';
  $('#filter-cat').value = keep;
}
function renderProducts() {
  const q = $('#search').value.trim().toLowerCase(), cat = $('#filter-cat').value;
  const list = products.filter(p =>
    (!cat || (cat === '__none' ? !p.category_id : p.category_id === cat)) &&
    (!q || p.name.toLowerCase().includes(q) || String(p.id) === q));
  $('#count').textContent = `${list.length} من ${products.length}`;
  $('#grid').innerHTML = list.map(p => {
    const first = p.colors?.[0]?.image ? imgSrc(p.colors[0].image) : '';
    return `<article class="pcard ${p.active ? '' : 'hidden-p'}" data-id="${p.id}">
      <div class="frame"><img class="bg" src="${esc(first)}" alt="" loading="lazy"><img class="fg" src="${esc(first)}" alt="${esc(p.name)}" loading="lazy"></div>
      <div class="info"><h4>${esc(p.name)}${p.active ? '' : '<span class="badge">مخفي</span>'}</h4>
        <span class="muted small">#${p.id} · ${esc(catName(p.category_id))}</span>
        <div class="dots">${(p.colors || []).map(c => `<i style="background:${esc(c.hex)}"></i>`).join('')}</div></div>
      <div class="actions">
        <button class="btn sm" data-act="edit">تعديل</button>
        <button class="btn sm" data-act="toggle">${p.active ? 'إخفاء' : 'إظهار'}</button>
        <button class="btn sm danger" data-act="del">حذف</button></div></article>`;
  }).join('') || '<p class="empty">ما في منتجات مطابقة</p>';
}
$('#search').addEventListener('input', renderProducts);
$('#filter-cat').addEventListener('change', renderProducts);
$('#new-product').addEventListener('click', () => openEditor(null));

async function removeFromBucket(paths) {
  paths = paths.filter(Boolean);
  if (!paths.length) return;
  try { await api(`/storage/v1/object/${IMAGE_BUCKET}`, { method: 'DELETE', body: { prefixes: paths } }); }
  catch (e) { console.warn('تعذر حذف بعض الصور القديمة:', e.message); }
}
$('#grid').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const p = products.find(x => x.id === +btn.closest('.pcard').dataset.id); if (!p) return;
  try {
    if (btn.dataset.act === 'edit') openEditor(p);
    if (btn.dataset.act === 'toggle') {
      await api(`/rest/v1/products?id=eq.${p.id}`, { method: 'PATCH', body: { active: !p.active }, headers: { Prefer: 'return=minimal' } });
      await loadData(); toast(p.active ? 'تم إظهار المنتج' : 'تم إخفاء المنتج', 'ok');
    }
    if (btn.dataset.act === 'del') {
      if (!confirm(`حذف "${p.name}" نهائياً؟ ما في رجعة.`)) return;
      await api(`/rest/v1/products?id=eq.${p.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await removeFromBucket((p.colors || []).map(c => bucketPath(c.image)));
      await loadData(); toast('تم حذف المنتج', 'ok');
    }
  } catch (ex) { toast(ex.message, 'err'); }
});

/* ---------- محرر المنتج ---------- */
async function guessColor(blob) {   // لون تقريبي من وسط الصورة كقيمة مبدئية
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, bmp.width * .3, bmp.height * .3, bmp.width * .4, bmp.height * .4, 0, 0, 16, 16);
    const d = ctx.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    bmp.close?.();
    return '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  } catch { return '#cccccc'; }
}
function openEditor(p) {
  ed = { id: p?.id ?? null, orig: (p?.colors || []).map(c => c.image),
         colors: (p?.colors || []).map(c => ({ hex: normHex(c.hex), image: c.image })) };
  $('#editor-title').textContent = p ? `تعديل منتج #${p.id}` : 'منتج جديد';
  $('#f-name').value = p?.name || ''; $('#f-desc').value = p?.description || '';
  $('#f-active').checked = p ? p.active : true;
  $('#f-cat').innerHTML = '<option value="">بدون تصنيف</option>' +
    categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#f-cat').value = p?.category_id || '';
  $('#save-status').textContent = '';
  renderColors(); $('#editor').showModal();
}
function closeEditor() {
  ed?.colors.forEach(c => c.opt && URL.revokeObjectURL(c.opt.preview));
  ed = null; $('#editor').close();
}
function renderColors() {
  $('#colors').innerHTML = ed.colors.map((c, i) => {
    const src = c.opt ? c.opt.preview : imgSrc(c.image);
    return `<div class="color-row" data-i="${i}">
      <div class="frame"><img class="bg" src="${esc(src)}" alt=""><img class="fg" src="${esc(src)}" alt=""></div>
      <div class="color-ctl">
        <input type="color" value="${c.hex}" data-act="hex" aria-label="اللون">
        ${i === 0 ? '<span class="tag">الصورة الرئيسية</span>' : '<button type="button" class="btn sm" data-act="main">اجعلها رئيسية</button>'}
        <button type="button" class="btn sm" data-act="replace">تغيير الصورة</button>
        <button type="button" class="btn sm danger" data-act="remove">حذف</button>
        ${c.opt ? `<span class="muted small" dir="ltr">${fmtSize(c.opt.originalSize)} → ${fmtSize(c.opt.newSize)}</span>` : ''}
      </div></div>`;
  }).join('') || '<p class="muted">ما أضفت صور بعد.</p>';
}
async function prepare(file) {
  const opt = await optimizeImage(file);
  opt.preview = URL.createObjectURL(opt.blob);
  return opt;
}
$('#add-files').addEventListener('change', async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  $('#save-status').textContent = 'جاري تجهيز الصور...';
  for (const f of files) {
    try { const opt = await prepare(f); ed.colors.push({ hex: await guessColor(opt.blob), image: null, opt }); }
    catch { toast(`تعذر قراءة الصورة ${f.name}`, 'err'); }
  }
  $('#save-status').textContent = ''; renderColors();
});
let replaceIdx = -1;
$('#replace-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || replaceIdx < 0) return;
  try {
    const opt = await prepare(f), c = ed.colors[replaceIdx];
    if (c.opt) URL.revokeObjectURL(c.opt.preview);
    c.opt = opt; renderColors();
  } catch { toast('تعذر قراءة الصورة', 'err'); }
});
$('#colors').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const i = +b.closest('.color-row').dataset.i, c = ed.colors[i];
  if (b.dataset.act === 'main') { ed.colors.unshift(ed.colors.splice(i, 1)[0]); renderColors(); }
  if (b.dataset.act === 'replace') { replaceIdx = i; $('#replace-file').click(); }
  if (b.dataset.act === 'remove') { if (c.opt) URL.revokeObjectURL(c.opt.preview); ed.colors.splice(i, 1); renderColors(); }
});
$('#colors').addEventListener('input', (e) => {
  if (e.target.dataset.act === 'hex') ed.colors[+e.target.closest('.color-row').dataset.i].hex = e.target.value;
});
$('#editor-close').addEventListener('click', closeEditor);
$('#cancel').addEventListener('click', closeEditor);
$('#editor').addEventListener('cancel', (e) => { e.preventDefault(); closeEditor(); });

async function uploadImage(opt) {
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${opt.ext}`;
  await api(`/storage/v1/object/${IMAGE_BUCKET}/${name}`, {
    method: 'POST', body: opt.blob, raw: true,
    headers: { 'Content-Type': opt.blob.type || 'image/webp', 'x-upsert': 'false' },
  });
  return name;
}
$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#f-name').value.trim();
  if (!name) return toast('اكتب اسم المنتج', 'err');
  if (!ed.colors.length) return toast('أضف صورة وحدة على الأقل', 'err');
  const saveBtn = $('#save'); saveBtn.disabled = true;
  const uploaded = [];
  try {
    const colors = [], total = ed.colors.filter(c => c.opt).length; let n = 0;
    for (const c of ed.colors) {
      if (c.opt) {
        $('#save-status').textContent = `جاري رفع الصور ${++n}/${total}...`;
        const path = await uploadImage(c.opt); uploaded.push(path);
        colors.push({ hex: c.hex, image: publicUrl(path) });
      } else colors.push({ hex: c.hex, image: c.image });
    }
    $('#save-status').textContent = 'جاري الحفظ...';
    const row = { name, description: $('#f-desc').value.trim(), category_id: $('#f-cat').value || null,
                  active: $('#f-active').checked, colors };
    if (ed.id == null) {
      row.sort_order = products.length ? Math.min(...products.map(p => p.sort_order)) - 1 : 0;   // الجديد يظهر أولاً
      await api('/rest/v1/products', { method: 'POST', body: row, headers: { Prefer: 'return=minimal' } });
    } else {
      await api(`/rest/v1/products?id=eq.${ed.id}`, { method: 'PATCH', body: row, headers: { Prefer: 'return=minimal' } });
    }
    const keep = new Set(colors.map(c => c.image));
    await removeFromBucket(ed.orig.filter(u => !keep.has(u)).map(bucketPath));
    closeEditor(); await loadData(); toast('تم الحفظ', 'ok');
  } catch (ex) {
    await removeFromBucket(uploaded);   // نلغي اللي انرفع إذا فشل الحفظ
    toast(ex.message, 'err');
  } finally { saveBtn.disabled = false; $('#save-status').textContent = ''; }
});

/* ---------- التصنيفات ---------- */
function renderCategories() {
  const count = (id) => products.filter(p => p.category_id === id).length;
  $('#cat-list').innerHTML = categories.map(c => `<div class="cat-row" data-id="${esc(c.id)}">
      <input value="${esc(c.name)}" maxlength="60" aria-label="اسم التصنيف">
      <span class="muted small">${count(c.id)} منتج</span>
      <button class="btn sm" data-act="cat-save">حفظ</button>
      <button class="btn sm danger" data-act="cat-del">حذف</button></div>`).join('') || '<p class="muted">ما في تصنيفات.</p>';
}
$('#cat-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const row = b.closest('.cat-row'), id = row.dataset.id;
  try {
    if (b.dataset.act === 'cat-save') {
      const name = $('input', row).value.trim(); if (!name) return toast('الاسم فاضي', 'err');
      await api(`/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { name }, headers: { Prefer: 'return=minimal' } });
      await loadData(); toast('تم الحفظ', 'ok');
    }
    if (b.dataset.act === 'cat-del') {
      const n = products.filter(p => p.category_id === id).length;
      if (!confirm(`حذف التصنيف؟${n ? ` ${n} منتج رح يصير "بدون تصنيف".` : ''}`)) return;
      await api(`/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await loadData(); toast('تم الحذف', 'ok');
    }
  } catch (ex) { toast(ex.message, 'err'); }
});
$('#cat-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#cat-new').value.trim(); if (!name) return;
  try {
    const sort_order = categories.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
    await api('/rest/v1/categories', { method: 'POST', body: { id: 'c' + Date.now().toString(36), name, sort_order }, headers: { Prefer: 'return=minimal' } });
    $('#cat-new').value = ''; await loadData(); toast('تمت الإضافة', 'ok');
  } catch (ex) { toast(ex.message, 'err'); }
});

/* ---------- تشغيل ---------- */
(async () => {
  if (!session) return show('login');
  try { await enter(); } catch (ex) { show('login'); if (session === null) { $('#login-error').textContent = ex.message; $('#login-error').hidden = false; } }
})();
