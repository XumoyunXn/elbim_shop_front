(async function () {
  initCommon();
  const params = new URLSearchParams(location.search);
  const state = {
    category: params.get('category') || '',
    size: '',
    sort: 'popular',
    q: (params.get('q') || '').toLowerCase()
  };
  const $ = id => document.getElementById(id);
  const d = await loadData();

  window.onSearch = v => { state.q = v.trim().toLowerCase(); render(); };
  $('sortSelect').addEventListener('change', e => { state.sort = e.target.value; render(); });

  function renderSidebar() {
    const total = d.products.length;
    const items = [`<li><a href="#" data-cat="" class="${state.category === '' ? 'font-bold text-black' : 'hover:text-black'} flex justify-between"><span>Barchasi</span><span class="text-gray-400">(${total})</span></a></li>`]
      .concat(d.categories.map(c => {
        const n = d.products.filter(p => String(p.categoryId) === String(c.id)).length;
        const active = String(state.category) === String(c.id);
        return `<li><a href="#" data-cat="${esc(c.id)}" class="${active ? 'font-bold text-black' : 'hover:text-black'} flex justify-between"><span>${esc(c.name)}</span><span class="text-gray-400">(${n})</span></a></li>`;
      }));
    $('categoryList').innerHTML = items.join('');
    $('categoryList').querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      state.category = a.dataset.cat;
      history.replaceState(null, '', state.category ? '?category=' + enc(state.category) : location.pathname);
      renderSidebar(); render();
    }));

    $('sizeFilter').innerHTML = d.sizes.length ? d.sizes.map(s => {
      const on = String(state.size) === String(s.id);
      return `<button data-size="${esc(s.id)}" class="py-1.5 border rounded text-xs font-medium transition ${on ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black'}">${esc(s.name)}</button>`;
    }).join('') : '<p class="col-span-4 text-xs text-gray-400">O\'lchamlar yo\'q</p>';
    $('sizeFilter').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      state.size = String(state.size) === b.dataset.size ? '' : b.dataset.size;
      renderSidebar(); render();
    }));
  }

  function render() {
    let list = d.products.filter(p =>
      (!state.category || String(p.categoryId) === String(state.category)) &&
      (!state.size || p.sizes.some(s => String(s.id) === String(state.size))) &&
      (!state.q || p.name.toLowerCase().includes(state.q)));

    if (state.sort === 'new') list = list.slice().sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
    if (state.sort === 'cheap') list = list.slice().sort((a, b) => a.price - b.price);
    if (state.sort === 'expensive') list = list.slice().sort((a, b) => b.price - a.price);

    const cat = d.catMap.get(String(state.category));
    const title = cat ? cat.name : 'Barcha mahsulotlar';
    $('pageTitle').textContent = title;
    $('bcCategory').textContent = cat ? cat.name : 'Mahsulotlar';
    document.title = title + ' — ELBIM';
    $('countText').innerHTML = `<span class="font-bold text-gray-900">${list.length} ta</span> mahsulot topildi`;
    $('productGrid').innerHTML = list.length ? list.map(p => productCard(p)).join('') : emptyBox('Mahsulot topilmadi');
  }

  renderSidebar();
  render();
})();
