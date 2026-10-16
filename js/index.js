(async function () {
  initCommon();
  const catGrid = document.getElementById('categoriesGrid');
  const popGrid = document.getElementById('popularGrid');
  const d = await loadData();

  if (!d.categories.length) {
    catGrid.innerHTML = emptyBox("Kategoriyalar hozircha yo'q");
  } else {
    catGrid.innerHTML = d.categories.map(c => `
      <a href="product.html?category=${enc(c.id)}" class="group relative rounded-xl overflow-hidden h-64 bg-gray-100 shadow-sm cursor-pointer block">
        <img src="${esc(c.image || PLACEHOLDER)}" alt="${esc(c.name)}" onerror="this.src=PLACEHOLDER" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        <div class="absolute inset-0 bg-gradient-to-t from-[#0a2540]/80 via-black/20 to-transparent"></div>
        <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
          <div>
            <h3 class="font-bold text-lg leading-tight">${esc(c.name)}</h3>
            ${c.description ? `<p class="text-xs text-gray-300">${esc(c.description)}</p>` : ''}
          </div>
          <span class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-brand-teal transition-colors">
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </span>
        </div>
      </a>`).join('');
  }

  if (!d.products.length) popGrid.innerHTML = emptyBox("Mahsulotlar hozircha yo'q");
  else popGrid.innerHTML = d.products.slice(0, 5).map(p => productCard(p, 'home')).join('');
})();
