import { getCatalog } from './data-source.js';

const container = document.getElementById('products-container');

const esc = (s = '') => String(s).replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));
const url = (p) => encodeURI(p); // يعالج المسافات في أسماء الصور

function cardHTML(p) {
  const colors = p.colors || [];
  const first = colors[0]?.image || '';
  return `
  <div class="product-card bg-[#1d3585] rounded-lg overflow-hidden shadow-md transition duration-300"
       data-category="${esc(p.category)}" data-id="${p.id}">
    <div class="img-frame">
      <img class="img-blur" src="${url(first)}" alt="" aria-hidden="true" loading="lazy">
      <img class="product-main-image" src="${url(first)}" alt="${esc(p.name)}" loading="lazy"
           id="product-image-${p.id}">
    </div>
    <div class="p-4">
      <h3 class="font-bold text-lg text-white mb-2">${esc(p.name)}</h3>
      <p class="text-gray-300 mb-3">${esc(p.description)}</p>
      ${colors.length > 1 ? `
      <div class="mb-3">
        <span class="font-medium text-white">الألوان المتاحة:</span>
        <div class="color-options mt-2">
          ${colors.map((c, i) => `
            <button class="color-btn ${i === 0 ? 'active' : ''}" aria-label="لون ${i + 1}"
                    data-product-id="${p.id}" data-image="${url(c.image)}"
                    style="background-color:${esc(c.hex)}"></button>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

// تبديل اللون (Event delegation: يشتغل على الكروت المرسومة ديناميكياً)
const preloaded = new Map();
const preload = (src) => {
  if (!preloaded.has(src)) {
    preloaded.set(src, new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(src); i.onerror = rej; i.src = src;
    }));
  }
  return preloaded.get(src);
};

container.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-btn');
  if (!btn) return;
  const id = btn.dataset.productId;
  const img = document.getElementById(`product-image-${id}`);
  if (!img) return;
  container.querySelectorAll(`.color-btn[data-product-id="${id}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const next = btn.dataset.image;
  const blur = img.closest('.img-frame')?.querySelector('.img-blur');
  const layers = [img, blur].filter(Boolean);
  const apply = () => layers.forEach(l => { l.src = next; l.classList.remove('fade-out'); });
  preload(next).then(() => {
    layers.forEach(l => l.classList.add('fade-out'));
    setTimeout(apply, 120);
  }).catch(apply);
});

async function init() {
  try {
    const { products = [] } = await getCatalog();
    const visible = products.filter(p => p.active !== false && p.colors?.length);
    container.innerHTML = visible.length
      ? visible.map(cardHTML).join('')
      : '<p class="col-span-full text-center text-gray-500">لا توجد منتجات حالياً</p>';
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="col-span-full text-center text-red-600">تعذر تحميل المنتجات، حاول مرة أخرى لاحقاً.</p>';
  }
}
init();
