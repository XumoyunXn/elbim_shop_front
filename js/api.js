/* ===== ELBIM — umumiy API va yordamchi funksiyalar ===== */
const ORIGIN = 'http://161.97.156.196';
const API = {
  categories: ORIGIN + '/categories/',
  products: ORIGIN + '/products/',
  productImages: ORIGIN + '/product-images/',
  colors: ORIGIN + '/colors/',
  sizes: ORIGIN + '/sizes/'
};

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="18" text-anchor="middle">Rasm yo\'q</text></svg>');

/* ---------- yordamchilar ---------- */
function pick(o, keys, d) {
  if (!o) return d;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return d;
}
function absUrl(u) {
  if (!u) return '';
  if (/^(https?:|data:)/i.test(u)) return u;
  return ORIGIN + (u.startsWith('/') ? u : '/' + u);
}
function formatPrice(n) {
  return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function enc(v) { return encodeURIComponent(String(v)); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function jsq(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emptyBox(text) {
  return `<div class="col-span-full text-center text-gray-400 text-sm py-12">${text}</div>`;
}

/* ---------- API so'rovlari (paginationni ham qo'llaydi) ---------- */
async function fetchAll(url) {
  let out = [], next = url, guard = 0;
  while (next && guard++ < 30) {
    const r = await fetch(next);
    if (!r.ok) throw new Error(next + ' → ' + r.status);
    const d = await r.json();
    if (Array.isArray(d)) { out = out.concat(d); break; }
    out = out.concat(Array.isArray(d.results) ? d.results : []);
    next = d.next || null;
  }
  return out;
}

const refId = v => (v && typeof v === 'object') ? v.id : v;
const toArr = v => v === undefined || v === null || v === '' ? [] : (Array.isArray(v) ? v : [v]);

let _dataPromise = null;
function loadData() {
  if (_dataPromise) return _dataPromise;
  _dataPromise = (async () => {
    const safe = u => fetchAll(u).catch(e => { console.error('API xato:', e); return []; });
    const [rc, rp, rpi, rco, rs] = await Promise.all([
      safe(API.categories), safe(API.products), safe(API.productImages), safe(API.colors), safe(API.sizes)
    ]);

    const colors = rco.map(c => {
      let hex = String(pick(c, ['hex', 'hex_code', 'code', 'color_code', 'value'], '#cccccc'));
      if (/^[0-9a-f]{3,8}$/i.test(hex)) hex = '#' + hex;
      return { id: c.id, name: pick(c, ['name', 'title', 'nom'], 'Rang'), hex };
    });
    const sizes = rs.map(s => ({ id: s.id, name: String(pick(s, ['name', 'title', 'size', 'value'], '?')) }));
    const categories = rc.map(c => ({
      id: c.id,
      name: pick(c, ['name', 'title', 'nom'], 'Kategoriya'),
      image: absUrl(pick(c, ['image', 'photo', 'img', 'icon'], '')),
      description: pick(c, ['description', 'desc'], '')
    }));
    const colorMap = new Map(colors.map(c => [String(c.id), c]));
    const sizeMap = new Map(sizes.map(s => [String(s.id), s]));
    const catMap = new Map(categories.map(c => [String(c.id), c]));

    // product-images → mahsulot bo'yicha guruhlash
    const imgBy = {};
    rpi.forEach(pi => {
      const pid = refId(pick(pi, ['product', 'product_id', 'product_ref']));
      const url = absUrl(pick(pi, ['image', 'url', 'photo', 'img'], ''));
      if (pid === undefined || !url) return;
      (imgBy[String(pid)] = imgBy[String(pid)] || []).push(url);
    });

    const resolve = (val, map, nameKeys) => toArr(val).map(v => {
      if (v && typeof v === 'object') return map.get(String(v.id)) || v;
      return map.get(String(v));
    }).filter(Boolean);

    const products = rp.map(p => {
      let imgs = [];
      toArr(p.images).forEach(x => {
        const u = absUrl(typeof x === 'string' ? x : pick(x, ['image', 'url', 'photo'], ''));
        if (u) imgs.push(u);
      });
      const single = absUrl(pick(p, ['image', 'photo', 'main_image', 'thumbnail'], ''));
      if (single) imgs.unshift(single);
      imgs = imgs.concat(imgBy[String(p.id)] || []);
      imgs = [...new Set(imgs)];

      const catRaw = pick(p, ['category', 'category_id', 'category_ref']);
      const catId = refId(catRaw);
      const cat = (catRaw && typeof catRaw === 'object') ? catRaw : catMap.get(String(catId));

      return {
        id: p.id,
        name: pick(p, ['name', 'title', 'nom'], 'Mahsulot'),
        description: pick(p, ['description', 'desc', 'about'], ''),
        price: Number(pick(p, ['price', 'cost', 'narx'], 0)) || 0,
        oldPrice: Number(pick(p, ['old_price', 'oldPrice', 'original_price'], 0)) || 0,
        categoryId: catId,
        categoryName: cat ? pick(cat, ['name', 'title'], '') : pick(p, ['category_name'], ''),
        images: imgs,
        colors: resolve(pick(p, ['colors', 'color_ids', 'color']), colorMap),
        sizes: resolve(pick(p, ['sizes', 'size_ids', 'size']), sizeMap),
        isNew: !!pick(p, ['is_new', 'new', 'isNew'], false),
        rating: pick(p, ['rating'], null),
        raw: p
      };
    });

    return { categories, products, colors, sizes, catMap };
  })();
  return _dataPromise;
}

/* ---------- Savat (localStorage — sahifalar orasida umumiy) ---------- */
const CART_KEY = 'elbim_cart';
const WISH_KEY = 'elbim_wishlist';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch {} updateCartBadge(); }
function getWish() { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; } }
function saveWish(w) { try { localStorage.setItem(WISH_KEY, JSON.stringify(w)); } catch {} }
function updateCartBadge() {
  const b = document.getElementById('cartBadge');
  if (!b) return;
  const n = getCart().reduce((a, i) => a + i.qty, 0);
  b.textContent = n;
  b.classList.toggle('hidden', n === 0);
}
function addToCartItem(p, color, size, qty = 1) {
  const cart = getCart();
  const id = [p.id, color ? color.id ?? color.name : '', size ? size.id ?? size.name : ''].join('-');
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty += qty;
  else cart.push({
    id, productId: p.id, name: p.name,
    color: color ? color.name : '', size: size ? size.name : '',
    price: p.price, image: p.images[0] || PLACEHOLDER, qty
  });
  saveCart(cart);
}

/* ---------- Toast ---------- */
function showToast(msg) {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'fixed bottom-5 right-5 z-[60] flex flex-col gap-2';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = 'bg-gray-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ---------- Mahsulot kartochkasi (index va product sahifalari uchun) ---------- */
function productCard(p, variant) {
  const home = variant === 'home';
  const img = p.images[0] || PLACEHOLDER;
  const colors = p.colors.length ? `
    <div class="mt-3 pt-2 border-t border-gray-100">
      <p class="text-[10px] font-semibold text-gray-600 mb-1.5">Rang:</p>
      <div class="flex items-center flex-wrap gap-1.5">
        ${p.colors.map((c, i) => `<span title="${esc(c.name)}" class="w-4 h-4 rounded-full border border-gray-300 ${i === 0 ? 'ring-2 ring-offset-1 ring-black' : ''}" style="background:${esc(c.hex)}"></span>`).join('')}
      </div>
    </div>` : '';
  return `
  <div class="bg-white ${home ? 'rounded-2xl' : 'rounded-lg'} p-3 border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition">
    <div>
      <a href="order.html?id=${enc(p.id)}" class="block relative bg-gray-100 ${home ? 'rounded-xl h-72' : 'rounded-md h-64'} overflow-hidden mb-3">
        ${p.isNew ? '<span class="absolute top-2 left-2 bg-[#E0A96D] text-black text-[9px] font-bold px-2 py-0.5 rounded z-10">Yangi</span>' : ''}
        <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src=PLACEHOLDER" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
      </a>
      <a href="order.html?id=${enc(p.id)}" class="text-xs ${home ? 'text-sm' : ''} font-bold text-gray-900 hover:text-brand-teal">${esc(p.name)}</a>
      <p class="text-[10px] text-gray-400 mt-0.5">${esc(p.categoryName)}</p>
      ${p.rating ? `<div class="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500"><i class="fa-solid fa-star text-amber-400"></i><span class="font-bold text-gray-800">${esc(p.rating)}</span></div>` : ''}
      ${colors}
    </div>
    <div class="mt-4 pt-2 border-t border-gray-50">
      ${p.price > 0 ? `<p class="text-xs font-extrabold text-gray-900 mb-2">${formatPrice(p.price)} so'm</p>` : ''}
      <button onclick="quickAdd('${jsq(p.id)}')" class="w-full mt-2 py-2.5 bg-[#0a2540] hover:bg-brand-teal text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors">
        <i class="fa-solid fa-cart-shopping"></i><span>Savatga qo'shish</span>
      </button>
    </div>
  </div>`;
}

// O'lcham tanlash kerak bo'lsa — mahsulot sahifasiga o'tadi, bo'lmasa to'g'ridan-to'g'ri savatga qo'shadi
async function quickAdd(id) {
  const d = await loadData();
  const p = d.products.find(x => String(x.id) === String(id));
  if (!p) return;
  if (p.sizes.length > 1 || p.colors.length > 1) { location.href = 'order.html?id=' + enc(p.id); return; }
  addToCartItem(p, p.colors[0], p.sizes[0], 1);
  showToast(p.name + " savatga qo'shildi!");
}

/* ---------- Umumiy header: savat belgisi va qidiruv ---------- */
function initCommon() {
  updateCartBadge();
  const s = document.getElementById('searchInput');
  if (!s) return;
  s.addEventListener('input', () => { if (window.onSearch) window.onSearch(s.value); });
  s.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !window.onSearch) location.href = 'product.html?q=' + enc(s.value.trim());
  });
  const q = new URLSearchParams(location.search).get('q');
  if (q && window.onSearch) s.value = q;
}
