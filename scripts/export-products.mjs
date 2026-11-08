import { readFile, writeFile } from 'node:fs/promises';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const FILE = 'data/products.json';

async function get(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

const [cats, prods] = await Promise.all([
  get('categories?select=id,name&order=sort_order.asc'),
  get('products?select=id,name,description,category_id,active,colors&active=eq.true&order=sort_order.asc,id.desc'),
]);
if (!prods.length) throw new Error('Supabase رجّع 0 منتجات، ما رح نكتب فوق النسخة الاحتياطية.');

const out = {
  categories: cats,
  products: prods.map(p => ({ id: p.id, name: p.name, category: p.category_id,
                              description: p.description, active: p.active, colors: p.colors })),
};
const next = JSON.stringify(out, null, 2) + '\n';
let prev = ''; try { prev = await readFile(FILE, 'utf8'); } catch { /* ملف جديد */ }
if (prev === next) { console.log('ما في تغيير.'); process.exit(0); }
await writeFile(FILE, next);
console.log(`تم التحديث: ${prods.length} منتج.`);
