import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const TIMEOUT_MS = 4000;

async function sb(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('Supabase ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fromSupabase() {
  const [cats, prods] = await Promise.all([
    sb('categories?select=id,name&order=sort_order.asc'),
    sb('products?select=id,name,description,category_id,active,colors&active=eq.true&order=sort_order.asc,id.desc'),
  ]);
  if (!Array.isArray(prods) || prods.length === 0) throw new Error('no products from Supabase');
  return {
    categories: cats,
    products: prods.map(p => ({
      id: p.id, name: p.name, description: p.description,
      category: p.category_id, active: p.active, colors: p.colors,
    })),
  };
}

async function fromJson() {
  const res = await fetch('data/products.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('تعذر تحميل المنتجات: ' + res.status);
  return res.json();
}

export async function getCatalog() {
  try {
    return await fromSupabase();
  } catch (err) {
    console.warn('Supabase غير متاح، نستخدم النسخة الاحتياطية:', err.message);
    return fromJson();
  }
}
