let data, P = null;
let currentSlide = 0, selectedColor = null, selectedSize = null, quantity = 1;
let cart = getCart();
const $ = id => document.getElementById(id);

window.addEventListener('load', async () => {
  initCommon();
  $('cartLink').addEventListener('click', e => { e.preventDefault(); toggleCartDrawer(); });
  updateCartUI();

  data = await loadData();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  P = data.products.find(p => String(p.id) === String(id)) || (id ? null : data.products[0]);

  if (!P) {
    document.querySelector('main').innerHTML = `<div class="text-center py-24 text-gray-400">Mahsulot topilmadi. <a href="product.html" class="underline text-black">Mahsulotlar ro'yxatiga qaytish</a></div>`;
    if (params.get('cart')) toggleCartDrawer(true);
    return;
  }
  renderProduct();
  if (params.get('cart')) toggleCartDrawer(true);
  lucide.createIcons();
});

/* ---------- Mahsulotni chizish ---------- */
function renderProduct() {
  document.title = P.name + ' — ELBIM Fashion & Textile';
  $('pdName').textContent = P.name;
  $('bcName').textContent = P.name;
  $('pdCategory').textContent = P.categoryName;
  $('bcCategory').textContent = P.categoryName || 'Mahsulotlar';
  $('bcCategory').href = 'product.html' + (P.categoryId !== undefined ? '?category=' + enc(P.categoryId) : '');
  $('specModel').textContent = P.name;
  $('specColor').textContent = P.colors.map(c => c.name).join(', ') || '—';
  if (P.description) { $('pdDesc').textContent = P.description; $('descText').textContent = P.description; }
  $('pdPrice').innerHTML = P.price > 0
    ? `<span class="text-2xl sm:text-3xl font-black text-gray-900">${formatPrice(P.price)} so'm</span>` +
      (P.oldPrice > P.price ? `<span class="text-sm text-gray-400 line-through">${formatPrice(P.oldPrice)} so'm</span>
        <span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">-${Math.round((1 - P.price / P.oldPrice) * 100)}%</span>` : '')
    : '';
  $('newBadge').style.display = P.isNew ? '' : 'none';

  selectedColor = P.colors[0] || null;
  $('selectedColorLabel').textContent = selectedColor ? selectedColor.name : '—';
  $('selectedSizeLabel').textContent = '—';
  $('colorBlock').style.display = P.colors.length ? '' : 'none';
  $('sizeBlock').style.display = P.sizes.length ? '' : 'none';

  if (!P.images.length) P.images = [PLACEHOLDER];
  renderThumbnails(); renderMainImage(); renderGalleryGrid();
  renderColors(); renderSizes(); renderReviews(); renderRelatedCarousel(); syncWishlistUI();
}

/* ---------- Galereya ---------- */
function renderMainImage() {
  const img = $('mainProductImage');
  img.onerror = () => { img.src = PLACEHOLDER; };
  img.src = P.images[currentSlide];
  document.querySelectorAll('.thumb-btn').forEach((btn, i) => {
    btn.className = 'thumb-btn w-16 h-20 rounded overflow-hidden flex-shrink-0 transition ' +
      (i === currentSlide ? 'border-2 border-black' : 'border border-gray-200 opacity-70 hover:opacity-100');
  });
}
function renderThumbnails() {
  $('thumbnailContainer').innerHTML = P.images.map((img, i) => `
    <button onclick="setSlide(${i})" class="thumb-btn w-16 h-20 border rounded overflow-hidden flex-shrink-0 transition">
      <img src="${esc(img)}" onerror="this.src=PLACEHOLDER" class="w-full h-full object-cover"></button>`).join('');
}
function setSlide(i) { currentSlide = i; renderMainImage(); }
function changeSlide(dir) { currentSlide = (currentSlide + dir + P.images.length) % P.images.length; renderMainImage(); }
function openLightbox() {
  $('lightboxImage').src = P.images[currentSlide];
  $('lightboxModal').classList.remove('hidden'); $('lightboxModal').classList.add('flex');
}
function closeLightbox() { $('lightboxModal').classList.add('hidden'); $('lightboxModal').classList.remove('flex'); }
function renderGalleryGrid() {
  const g = $('galleryGrid');
  if (P.images.length < 2) { g.innerHTML = ''; return; }
  g.innerHTML = P.images.map((img, i) => `
    <div class="h-48 rounded-lg overflow-hidden bg-gray-100 cursor-pointer group" onclick="setSlide(${i}); window.scrollTo({top:0,behavior:'smooth'})">
      <img src="${esc(img)}" onerror="this.src=PLACEHOLDER" class="w-full h-full object-cover group-hover:scale-105 transition duration-300"></div>`).join('');
}

/* ---------- Rang / o'lcham ---------- */
function renderColors() {
  $('colorContainer').innerHTML = P.colors.map((c, i) => `
    <button onclick="selectColor(${i})" title="${esc(c.name)}"
      class="w-6 h-6 rounded-full border border-gray-300 transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105'}"
      style="background-color:${esc(c.hex)}"></button>`).join('');
}
function selectColor(i) {
  selectedColor = P.colors[i];
  $('selectedColorLabel').textContent = selectedColor.name;
  renderColors();
}
function renderSizes() {
  $('sizeContainer').innerHTML = P.sizes.map((s, i) => `
    <button onclick="selectSize(${i})"
      class="py-2 rounded text-xs transition-all font-semibold ${selectedSize === s ? 'border-2 border-black bg-black text-white shadow-sm' : 'border border-gray-200 text-gray-800 hover:border-black'}">
      ${esc(s.name)}</button>`).join('');
}
function selectSize(i) {
  selectedSize = P.sizes[i];
  $('selectedSizeLabel').textContent = selectedSize.name;
  $('sizeError').classList.add('hidden');
  renderSizes();
}
function updateQty(ch) { quantity = Math.max(1, quantity + ch); $('qtyInput').value = quantity; }

/* ---------- Saralanganlar ---------- */
function syncWishlistUI() {
  const on = getWish().includes(String(P.id));
  ['wishlistIcon', 'wishlistIconBtn'].forEach(id => {
    const el = $(id); if (!el) return;
    el.classList.toggle('fill-red-500', on); el.classList.toggle('text-red-500', on);
  });
}
function toggleWishlist() {
  let w = getWish(); const id = String(P.id);
  if (w.includes(id)) { w = w.filter(x => x !== id); showToast("Saralanganlardan olib tashlandi."); }
  else { w.push(id); showToast("Saralanganlarga qo'shildi! ❤️"); }
  saveWish(w); syncWishlistUI();
}

/* ---------- Savat ---------- */
function addToCartMain() {
  if (P.sizes.length && !selectedSize) { $('sizeError').classList.remove('hidden'); return; }
  addToCartItem(P, selectedColor, selectedSize, quantity);
  cart = getCart(); updateCartUI();
  showToast(`${P.name} savatchaga qo'shildi!`);
  toggleCartDrawer(true);
}
function updateCartItemQty(id, ch) {
  const i = cart.findIndex(x => x.id === id);
  if (i > -1) { cart[i].qty += ch; if (cart[i].qty <= 0) cart.splice(i, 1); }
  saveCart(cart); updateCartUI();
}
function updateCartUI() {
  cart = getCart();
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  $('cartItemsList').innerHTML = cart.length ? cart.map(item => `
    <div class="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
      <img src="${esc(item.image)}" onerror="this.src=PLACEHOLDER" class="w-14 h-16 object-cover rounded">
      <div class="flex-1 text-xs">
        <h4 class="font-bold text-gray-800">${esc(item.name)}</h4>
        <p class="text-gray-400 text-[10px]">${esc([item.color, item.size].filter(Boolean).join(' / '))}</p>
        <p class="font-extrabold text-gray-900 mt-1">${formatPrice(item.price)} so'm</p>
      </div>
      <div class="flex items-center border border-gray-300 rounded bg-white text-xs">
        <button onclick="updateCartItemQty('${jsq(item.id)}', -1)" class="px-2 py-1 font-bold hover:bg-gray-100">-</button>
        <span class="px-2 font-bold">${item.qty}</span>
        <button onclick="updateCartItemQty('${jsq(item.id)}', 1)" class="px-2 py-1 font-bold hover:bg-gray-100">+</button>
      </div>
    </div>`).join('') : `<div class="text-center py-12 text-gray-400"><p class="text-xs">Savatchangiz bo'sh</p></div>`;
  $('cartTotalPrice').textContent = formatPrice(total) + " so'm";
  updateCartBadge();
}
function toggleCartDrawer(forceOpen = false) {
  const drawer = $('cartDrawer'), backdrop = $('cartBackdrop'), panel = $('cartPanel');
  if (drawer.classList.contains('hidden') || forceOpen) {
    drawer.classList.remove('hidden');
    setTimeout(() => { backdrop.classList.remove('opacity-0'); panel.classList.remove('translate-x-full'); }, 10);
  } else {
    backdrop.classList.add('opacity-0'); panel.classList.add('translate-x-full');
    setTimeout(() => drawer.classList.add('hidden'), 300);
  }
}
function checkout() {
  if (!cart.length) { showToast("Savatchangiz bo'sh!"); return; }
  // TODO: buyurtma yuborish uchun backendda orders endpoint kerak
  showToast("Buyurtma qabul qilindi! Tez orada siz bilan bog'lanamiz. 🎉");
  cart = []; saveCart(cart); updateCartUI(); toggleCartDrawer();
}

/* ---------- Tablar ---------- */
function switchTab(key) {
  document.querySelectorAll('#tabsHeader button').forEach(b => b.className = 'text-gray-400 hover:text-black pb-3 transition');
  const a = $('tab-btn-' + key);
  if (a) a.className = 'border-b-2 border-black pb-3 text-black font-bold transition';
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  const t = $('tab-content-' + key);
  if (t) t.classList.remove('hidden');
}

/* ---------- Sharhlar (hozircha faqat brauzerda; API yo'q) ---------- */
let reviews = [];
function renderReviews() {
  $('tabReviewsCount').textContent = reviews.length;
  $('reviewsList').innerHTML = reviews.length ? reviews.map(r => `
    <div class="bg-white p-3 sm:p-4 rounded-lg border border-gray-100 shadow-sm text-xs">
      <div class="flex items-center justify-between mb-1"><span class="font-bold text-gray-900">${esc(r.name)}</span><span class="text-[10px] text-gray-400">${esc(r.date)}</span></div>
      <div class="flex text-amber-400 mb-2">${'★'.repeat(r.rating)}</div>
      <p class="text-gray-600 leading-relaxed">${esc(r.text)}</p>
    </div>`).join('') : '<p class="text-xs text-gray-400">Hozircha sharhlar yo\'q. Birinchi bo\'lib fikr bildiring!</p>';
}
function handleReviewSubmit(e) {
  e.preventDefault();
  reviews.unshift({ name: $('reviewAuthor').value, rating: parseInt($('reviewRating').value), date: 'Hozir', text: $('reviewText').value });
  renderReviews(); $('reviewForm').reset(); showToast('Sharhingiz uchun rahmat!');
}

/* ---------- O'xshash mahsulotlar (shu kategoriyadan) ---------- */
function renderRelatedCarousel() {
  let rel = data.products.filter(p => p.id !== P.id && String(p.categoryId) === String(P.categoryId));
  if (rel.length < 3) rel = rel.concat(data.products.filter(p => p.id !== P.id && !rel.includes(p)));
  rel = rel.slice(0, 10);
  $('relatedSlider').innerHTML = rel.length ? rel.map(item => `
    <div class="min-w-[220px] sm:min-w-[240px] bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex flex-col justify-between group snap-start">
      <div>
        <a href="order.html?id=${enc(item.id)}" class="block relative bg-gray-100 rounded overflow-hidden h-48 mb-2">
          <img src="${esc(item.images[0] || PLACEHOLDER)}" onerror="this.src=PLACEHOLDER" class="w-full h-full object-cover group-hover:scale-105 transition duration-300"></a>
        <h4 class="text-xs font-bold text-gray-900 truncate">${esc(item.name)}</h4>
        <p class="text-[10px] text-gray-400">${esc(item.categoryName)}</p>
        ${item.price > 0 ? `<p class="text-xs font-extrabold text-gray-900 mt-2">${formatPrice(item.price)} so'm</p>` : ''}
      </div>
      <a href="order.html?id=${enc(item.id)}" class="block text-center w-full mt-3 py-2 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition">Batafsil</a>
    </div>`).join('') : '<p class="text-xs text-gray-400">O\'xshash mahsulotlar yo\'q</p>';
}
function scrollRelated(dir) { $('relatedSlider').scrollBy({ left: dir * 260, behavior: 'smooth' }); }
