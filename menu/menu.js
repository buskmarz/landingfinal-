(() => {
  'use strict';
  const root = document.querySelector('.menu-app');
  if (!root) return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const money = number => '$' + Number(number).toLocaleString('es-MX', {maximumFractionDigits: 2});
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dishes = $$('.dish');
  const sections = $$('[data-section]');
  const categories = $$('[data-category-filter]');
  const labels = Object.fromEntries(categories.map(button => [button.dataset.categoryFilter, button.textContent]));
  const search = $('#menu-search');
  const dishDialog = $('#dish-dialog');
  const cartDialog = $('#cart-dialog');
  const items = dishes.map(el => ({el, id: el.dataset.id, category: el.dataset.category, price: Number(el.dataset.price), name: el.querySelector('h3').textContent, size: el.querySelector('.dish-size').textContent, description: el.querySelector('.dish-description').textContent, haystack: normalize(el.textContent)}));
  const byWebId = new Map(items.map(item => [item.id, item]));
  const tastes = {clasico: ['cortado', 'flat-white', 'cappuccino', 'latte'], frio: ['cold-brew', 'cold-brew-tonic', 'espresso-tonic', 'kombucha'], dulce: ['affogato', 'croissant-de-nutella', 'waffles-frutos-rojos', 'brownie', 'enjambre', 'trufas'], comer: ['chilaquiles', 'molletes', 'avo-toast', 'el-iberico', 'golden', 'club-sandwich']};
  const STORAGE_KEY = 'bm-table-cart-v1';
  const API = '/api/table-order';
  let category = 'cafe', taste = '', budget = false, activeDish = null, detailQuantity = 1;
  let posCatalog = new Map(), catalogLoaded = false, session = null, catalogPromise = null;
  let tableEntry = typeof window.__bmTableEntry === 'string' ? window.__bmTableEntry : '';
  delete window.__bmTableEntry;
  let cart = [], pending = null, receipt = null, sending = false, sessionChecking = false;
  let toastTimer, pollTimer, modalOpener, previousOverflow = '', sourceChoice = '', variantChoice = '';
  let modifierChoices = new Set();

  // The QR capability is exchanged once for a HttpOnly cookie. Never store it or
  // include it in URLs, sharing links, analytics, cart persistence, or errors.
  async function api(action, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(body ? API : API + '?action=' + encodeURIComponent(action), {
        method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: body ? {'Content-Type': 'application/json'} : {'Accept': 'application/json'},
        ...(body ? {body: JSON.stringify({action, ...body})} : {})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error('Table request failed'); error.status = response.status; error.data = data; throw error; }
      return data;
    } finally { clearTimeout(timeout); }
  }
  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({cart, pending, receipt, savedAt: Date.now()})); } catch (_) { /* Browsing and ordering do not require local storage. */ }
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Date.now() - saved.savedAt < 6 * 60 * 60 * 1000 && Array.isArray(saved.cart)) {
      cart = saved.cart.filter(line => byWebId.has(line.webId) && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 6 && Number.isFinite(line.unitPrice) && line.unitPrice >= 0).slice(0, 12);
      pending = saved.pending && typeof saved.pending.idempotencyKey === 'string' && Array.isArray(saved.pending.items) ? saved.pending : null;
      receipt = saved.receipt && typeof saved.receipt.id === 'string' ? saved.receipt : null;
    }
  } catch (_) { /* A corrupt draft must not break the menu. */ }
  function track(event, cta) {
    if (!['bmoodcoffee.com', 'www.bmoodcoffee.com'].includes(location.hostname)) return;
    const payload = JSON.stringify({event, cta, path: location.pathname});
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/track-event', new Blob([payload], {type: 'application/json'}))) return;
      fetch('/api/track-event', {method: 'POST', headers: {'Content-Type':'application/json'}, body: payload, keepalive: true}).catch(() => {});
    } catch (_) { /* Analytics never affects the order. */ }
  }
  function toast(message) { clearTimeout(toastTimer); $('#menu-toast').textContent = message; $('#menu-toast').classList.add('visible'); toastTimer = setTimeout(() => $('#menu-toast').classList.remove('visible'), 2300); }
  function showModal(dialog, opener) {
    if (!dialog.showModal) return;
    if (dishDialog.open) dishDialog.close();
    if (cartDialog.open) cartDialog.close();
    modalOpener = opener || document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }
  [dishDialog, cartDialog].forEach(dialog => {
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => { if (!sending) dialog.close(); });
    dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog || sending) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; if (modalOpener && !modalOpener.closest('[hidden]')) modalOpener.focus(); });
  });
  function renderMenu() {
    const query = normalize(search.value.trim());
    let count = 0;
    items.forEach(item => {
      const visible = (query ? query.split(/\s+/).every(word => item.haystack.includes(word)) : category === 'all' || item.category === category) && (!taste || tastes[taste].includes(item.id)) && (!budget || item.price <= 75);
      item.el.hidden = !visible;
      item.el.classList.toggle('in-cart', cart.some(line => line.webId === item.id));
      if (visible) count++;
    });
    sections.forEach(section => { section.hidden = !section.querySelector('.dish:not([hidden])'); });
    categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category && !query && !taste)));
    $$('[data-taste]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.taste === taste)));
    $('#budget-filter').setAttribute('aria-pressed', String(budget));
    $('#clear-filters').hidden = !query && !taste && !budget && category === 'all';
    $('.empty-state').hidden = count > 0;
    $('#result-count').textContent = count + (count === 1 ? ' opción' : ' opciones') + (taste ? ' para tu antojo' : query ? ' en toda la carta' : category !== 'all' ? ' · ' + labels[category] : ' para elegir');
  }
  function rememberCategory() { const url = new URL(location.href); url.hash = category === 'all' ? 'catalogo' : category; url.searchParams.delete('producto'); history.replaceState(null, '', url); }
  function resetFilters() { category = 'all'; taste = ''; budget = false; search.value = ''; rememberCategory(); renderMenu(); }
  categories.forEach(button => button.addEventListener('click', () => { category = button.dataset.categoryFilter; taste = ''; search.value = ''; rememberCategory(); renderMenu(); track('menu_category_select', 'menu-' + category); }));
  search.addEventListener('input', () => { category = 'all'; taste = ''; renderMenu(); });
  $('#budget-filter').addEventListener('click', () => { budget = !budget; renderMenu(); });
  $('#clear-filters').addEventListener('click', resetFilters);
  $('#empty-reset').addEventListener('click', () => { resetFilters(); search.focus(); });
  $('.pick-toggle').addEventListener('click', () => { const picker = $('#taste-picker'); picker.hidden = !picker.hidden; $('.pick-toggle').setAttribute('aria-expanded', String(!picker.hidden)); });
  $$('[data-taste]').forEach(button => button.addEventListener('click', () => { taste = button.dataset.taste; category = 'all'; search.value = ''; budget = false; renderMenu(); track('menu_taste_select', 'taste-' + taste); $('.category-nav').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); }));

  function catalogOption(productId) { for (const group of posCatalog.values()) { const item = group.find(option => option.productId === productId); if (item) return item; } return null; }
  function selectedSource() { return (posCatalog.get(activeDish?.id) || []).find(option => option.productId === sourceChoice) || null; }
  function selectedPrice(source, variantId, modifierIds, fallback) {
    if (!source) return fallback;
    const variant = (source.variants || []).find(option => option.id === variantId);
    return source.price + Number(variant?.priceDelta || 0) + (source.modifiers || []).filter(option => modifierIds.includes(option.id)).reduce((sum, option) => sum + Number(option.priceDelta || 0), 0);
  }
  function validChoices(source, variantId, modifierIds) {
    if (!source) return false;
    if (source.variants?.length && !source.variants.some(option => option.id === variantId)) return false;
    if (modifierIds.some(id => !source.modifiers?.some(option => option.id === id))) return false;
    const groups = new Map();
    for (const modifier of source.modifiers || []) { const key = modifier.groupKey || 'extras'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(modifier); }
    for (const group of groups.values()) {
      const selected = group.filter(option => modifierIds.includes(option.id));
      if (group.some(option => option.groupRequired) && !selected.length) return false;
      if (group[0].groupMode === 'single' && selected.length > 1) return false;
    }
    return true;
  }
  function detailPrice() { return selectedPrice(selectedSource(), variantChoice, [...modifierChoices], activeDish?.price || 0); }
  function updateDetail() {
    if (!activeDish) return;
    const options = posCatalog.get(activeDish.id) || [];
    const source = selectedSource();
    const canChoose = !catalogLoaded || validChoices(source, variantChoice, [...modifierChoices]);
    $('#dialog-price').textContent = money(detailPrice()) + ' MXN';
    $('#dish-subtotal').textContent = money(detailPrice() * detailQuantity);
    $('#dish-quantity').textContent = detailQuantity;
    $('#dish-minus').disabled = detailQuantity <= 1 || !!pending;
    $('#dish-plus').disabled = detailQuantity >= 6 || !!pending;
    $('#add-to-cart').disabled = !canChoose || !!pending || sending || (catalogLoaded && !options.length);
    $('#dialog-availability').textContent = pending ? 'Tienes un envío por confirmar. Reinténtalo desde tu pedido antes de agregar algo más.' : catalogLoaded && !options.length ? 'Disponible para consultar en barra. Por ahora no se envía desde la mesa.' : catalogLoaded && !canChoose ? 'Elige las opciones de tu bebida o alimento para continuar.' : session ? 'Se agregará al pedido de ' + session.tableLabel + '.' : 'Arma tu selección. Para enviarla, abre el acceso de tu mesa.';
  }
  function selectControl(label, id, options, onChange) {
    const wrap = document.createElement('div'); wrap.className = 'modifier-fieldset';
    const title = document.createElement('label'); title.htmlFor = id; title.textContent = label; title.className = 'item-notes-label';
    const select = document.createElement('select'); select.id = id;
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Elige una opción'; select.append(empty);
    options.forEach(option => { const el = document.createElement('option'); el.value = option.id; el.textContent = option.name + (option.priceDelta ? ' (+' + money(option.priceDelta) + ')' : ''); select.append(el); });
    select.addEventListener('change', () => onChange(select.value)); wrap.append(title, select); return wrap;
  }
  function renderChoices() {
    let container = $('#dish-options');
    if (!container) { container = document.createElement('div'); container.id = 'dish-options'; $('.item-notes-label').before(container); }
    container.replaceChildren();
    const options = posCatalog.get(activeDish.id) || [];
    if (options.length > 1) {
      const picker = selectControl('Elige tu opción', 'dish-source', options.map(option => ({id: option.productId, name: option.name})), value => { sourceChoice = value; variantChoice = ''; modifierChoices.clear(); renderChoices(); updateDetail(); });
      picker.querySelector('select').value = sourceChoice; container.append(picker);
    }
    const source = selectedSource();
    if (!source) return;
    if (source.variants?.length) {
      const picker = selectControl('Presentación', 'dish-variant', source.variants, value => { variantChoice = value; updateDetail(); }); picker.querySelector('select').value = variantChoice; container.append(picker);
    }
    const groups = new Map();
    (source.modifiers || []).forEach(modifier => { const key = modifier.groupKey || 'extras'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(modifier); });
    for (const [key, group] of groups) {
      const fieldset = document.createElement('fieldset'); fieldset.className = 'modifier-fieldset';
      const legend = document.createElement('legend'); legend.textContent = (group[0].groupLabel || 'Personaliza') + (group.some(option => option.groupRequired) ? ' · Elige una opción' : ' · Opcional'); fieldset.append(legend);
      group.forEach(modifier => {
        const label = document.createElement('label'); const input = document.createElement('input'); input.type = group[0].groupMode === 'single' && group.some(option => option.groupRequired) ? 'radio' : 'checkbox'; input.name = 'modifier-' + key; input.value = modifier.id; input.checked = modifierChoices.has(modifier.id);
        input.addEventListener('change', () => { if (group[0].groupMode === 'single') group.forEach(option => modifierChoices.delete(option.id)); if (input.checked) modifierChoices.add(modifier.id); else modifierChoices.delete(modifier.id); fieldset.querySelectorAll('input').forEach(control => { control.checked = modifierChoices.has(control.value); }); updateDetail(); });
        const text = document.createElement('span'); text.textContent = modifier.name + (modifier.priceDelta ? ' (+' + money(modifier.priceDelta) + ')' : ''); label.append(input, text); fieldset.append(label);
      }); container.append(fieldset);
    }
  }
  function openDish(item, opener) {
    if (!item) return;
    activeDish = item; detailQuantity = 1; sourceChoice = ''; variantChoice = ''; modifierChoices.clear();
    const options = posCatalog.get(item.id) || [];
    if (options.length === 1) sourceChoice = options[0].productId;
    $('#dialog-category').textContent = labels[item.category]; $('#dialog-name').textContent = item.name;
    $('#dialog-size').textContent = item.size; $('#dialog-description').textContent = item.description;
    $('#dish-notes').value = ''; $('#share-status').textContent = ''; renderChoices(); updateDetail(); showModal(dishDialog, opener); track('menu_item_view', item.id);
  }
  $$('[data-detail]').forEach(button => button.addEventListener('click', () => openDish(byWebId.get(button.dataset.detail), button)));
  $('#dish-minus').addEventListener('click', () => { detailQuantity = Math.max(1, detailQuantity - 1); updateDetail(); });
  $('#dish-plus').addEventListener('click', () => { detailQuantity = Math.min(6, detailQuantity + 1); updateDetail(); });
  $('#share-dish').addEventListener('click', async () => {
    if (!activeDish) return;
    const url = new URL('/menu/', location.origin); url.searchParams.set('producto', activeDish.id);
    try {
      if (navigator.share) await navigator.share({title: activeDish.name + ' · Better Mood', url: url.href});
      else if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(url.href); $('#share-status').textContent = 'Enlace copiado. Compártelo con quien venga contigo.'; }
      else $('#share-status').textContent = 'Enlace: ' + url.href;
    } catch (error) { if (error.name !== 'AbortError') $('#share-status').textContent = 'Enlace: ' + url.href; }
  });
  $('#add-to-cart').addEventListener('click', () => {
    if (!activeDish || pending || sending) return;
    const source = selectedSource();
    if (catalogLoaded && !validChoices(source, variantChoice, [...modifierChoices])) return;
    const modifiers = [...modifierChoices].sort();
    const notes = $('#dish-notes').value.trim().slice(0, 160);
    const productId = source?.productId || null;
    const key = JSON.stringify([activeDish.id, productId, variantChoice, modifiers, notes]);
    const existing = cart.find(line => line.key === key);
    if (existing && existing.quantity + detailQuantity > 6) { toast('Puedes agregar hasta 6 unidades de la misma opción.'); return; }
    if (!existing && cart.length >= 12) { toast('Puedes enviar hasta 12 opciones por pedido.'); return; }
    const line = {key, webId: activeDish.id, productId, name: source?.name || activeDish.name, quantity: detailQuantity, notes, unitPrice: detailPrice(), variantId: variantChoice || undefined, modifierIds: modifiers, optionLabels: [...(source?.variants || []).filter(option => option.id === variantChoice), ...(source?.modifiers || []).filter(option => modifiers.includes(option.id))].map(option => option.name)};
    if (existing) existing.quantity += detailQuantity; else cart.push(line);
    receipt = null; persist(); renderCart(); renderMenu(); dishDialog.close(); toast(activeDish.name + ' agregado');
  });
  function activeSession() { return !!session && Date.parse(session.expiresAt) > Date.now(); }
  function cartTotal() { return cart.reduce((total, line) => total + line.quantity * line.unitPrice, 0); }
  function lineAvailable(line) { const source = catalogOption(line.productId); return !!source && validChoices(source, line.variantId, line.modifierIds || []); }
  function cartReady() { return activeSession() && catalogLoaded && cart.length > 0 && cart.length <= 12 && cartTotal() <= 3000 && cart.every(lineAvailable); }
  function setCartStatus(message) { $('#cart-status').textContent = message; }
  function renderSession() {
    const active = activeSession();
    $('#table-context').classList.toggle('is-active', active);
    $('#table-context-text').textContent = active ? session.tableLabel + ' · Tu acceso está listo para pedir.' : tableEntry ? 'Comprobando el acceso de tu mesa…' : 'Explora la carta. Arma tu pedido a tu gusto.';
    $('#table-help').hidden = active;
    $('#table-help').textContent = tableEntry ? 'Reintentar acceso' : '¿Ya estás aquí?';
    $('#cart-table-label').textContent = active ? session.tableLabel + ' · UPAEP' : 'TU PAUSA, A TU GUSTO';
    $('#cart-session-help').hidden = active;
    renderCart();
  }
  function changeCart(index, delta) {
    if (pending || sending || !cart[index]) return;
    cart[index].quantity = Math.min(6, cart[index].quantity + delta);
    if (cart[index].quantity < 1) cart.splice(index, 1);
    persist(); renderCart(); renderMenu();
  }
  function renderCart() {
    const count = cart.reduce((sum, line) => sum + line.quantity, 0);
    $$('[data-cart-count]').forEach(el => { el.textContent = String(count); });
    $('.cart-dock').hidden = !count && !receipt;
    $('.header-cart').hidden = false;
    $('#dock-total').textContent = receipt && !count ? 'Ver estado' : money(cartTotal());
    $('#cart-total').textContent = money(cartTotal());
    $('#cart-total-row>span').textContent = activeSession() && cart.every(lineAvailable) ? 'Total' : 'Total estimado';
    $('#cart-empty').hidden = count > 0 || !!receipt;
    $('#cart-total-row').hidden = !count; $('.cart-payment').hidden = !count;
    $('#cart-items').replaceChildren();
    cart.forEach((line, index) => {
      const row = document.createElement('article'); row.className = 'cart-line';
      const top = document.createElement('div'); top.className = 'cart-line-top';
      const name = document.createElement('h3'); name.textContent = line.name; const price = document.createElement('span'); price.className = 'cart-line-price'; price.textContent = money(line.unitPrice * line.quantity); top.append(name, price); row.append(top);
      if (line.optionLabels?.length || line.notes) { const notes = document.createElement('p'); notes.className = 'cart-line-notes'; notes.textContent = [...(line.optionLabels || []), line.notes].filter(Boolean).join(' · '); row.append(notes); }
      const bottom = document.createElement('div'); bottom.className = 'cart-line-bottom';
      const stepper = document.createElement('div'); stepper.className = 'quantity-stepper';
      const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Quitar una unidad de ' + line.name); minus.disabled = !!pending || sending; minus.addEventListener('click', () => changeCart(index, -1));
      const quantity = document.createElement('output'); quantity.textContent = line.quantity;
      const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Agregar una unidad de ' + line.name); plus.disabled = line.quantity >= 6 || !!pending || sending; plus.addEventListener('click', () => changeCart(index, 1)); stepper.append(minus, quantity, plus);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Quitar'; remove.disabled = !!pending || sending; remove.setAttribute('aria-label', 'Quitar ' + line.name + ' del pedido'); remove.addEventListener('click', () => { cart.splice(index, 1); persist(); renderCart(); renderMenu(); }); bottom.append(stepper, remove); row.append(bottom);
      if (catalogLoaded && !lineAvailable(line)) { const unavailable = document.createElement('p'); unavailable.className = 'cart-line-unavailable'; unavailable.textContent = 'Esta opción necesita confirmarse en barra. Quítala del envío o vuelve a elegirla en la carta.'; row.append(unavailable); }
      $('#cart-items').append(row);
    });
    const submit = $('#submit-order');
    const differentSession = pending?.sessionId && pending.sessionId !== session?.id;
    $('#resolve-pending').hidden = !pending || (activeSession() && !differentSession);
    submit.disabled = sending || (!pending && !cartReady()) || !activeSession() || !!differentSession;
    submit.hidden = !count;
    submit.textContent = sending ? 'Confirmando tu pedido…' : differentSession ? 'Confirma el envío anterior con el equipo' : !activeSession() ? 'Necesitas el acceso de tu mesa' : pending ? 'Reintentar este mismo pedido' : cartTotal() > 3000 ? 'El pedido supera el límite por envío' : !catalogLoaded ? 'Comprobando disponibilidad…' : !cart.every(lineAvailable) ? 'Revisa las opciones de tu pedido' : 'Enviar a la cafetería · ' + money(cartTotal());
    renderReceipt();
  }
  const statusLabels = {received: 'Pedido recibido en la cafetería', accepted: 'Tu pedido está en preparación', preparing: 'Tu pedido está en preparación', ready: 'Tu pedido está listo', served: 'Pedido entregado', delivered: 'Pedido entregado', cancelled: 'Pedido cancelado', rejected: 'El equipo necesita revisar tu pedido', paid: 'Pedido pagado', closed: 'Pedido cerrado'};
  function renderReceipt() {
    const target = $('#cart-receipt'); target.replaceChildren(); target.hidden = !receipt;
    if (!receipt) return;
    const mark = document.createElement('div'); mark.className = 'receipt-mark'; mark.textContent = receipt.status === 'cancelled' ? '—' : '✓';
    const title = document.createElement('p'); title.className = 'receipt-title'; title.textContent = statusLabels[receipt.status] || 'Pedido recibido en la cafetería';
    const number = document.createElement('p'); number.className = 'receipt-number'; number.textContent = 'Pedido ' + (receipt.number || receipt.id.slice(-8));
    const copy = document.createElement('p'); copy.className = 'receipt-copy'; copy.textContent = 'Puedes seguir explorando la carta. El pago se realiza en la cafetería.';
    target.append(mark, title, number);
    if (Array.isArray(receipt.items)) { const list = document.createElement('ul'); list.className = 'receipt-items'; receipt.items.forEach(item => { const li = document.createElement('li'); li.textContent = (item.quantity || 1) + ' × ' + (item.name || 'Producto'); list.append(li); }); target.append(list); }
    if (Number.isFinite(receipt.total)) { const total = document.createElement('p'); total.className = 'receipt-number'; total.textContent = 'Total: ' + money(receipt.total); target.append(total); }
    target.append(copy);
  }
  $$('[data-open-cart]').forEach(button => button.addEventListener('click', () => { renderCart(); showModal(cartDialog, button); if (pending) setCartStatus('El envío anterior está por confirmar. Reintenta el mismo pedido; no se duplicará.'); }));
  $('#pending-reviewed').addEventListener('change', () => { $('#start-new-order').disabled = !$('#pending-reviewed').checked; });
  $('#start-new-order').addEventListener('click', () => { if (!$('#pending-reviewed').checked || sending) return; pending = null; cart = []; receipt = null; $('#pending-reviewed').checked = false; $('#start-new-order').disabled = true; persist(); setCartStatus('Puedes armar un pedido nuevo. Necesitas un acceso de mesa activo para enviarlo.'); renderMenu(); renderCart(); });
  $('#continue-menu').addEventListener('click', () => { if (!sending) cartDialog.close(); });
  $('#table-help').addEventListener('click', () => { if (tableEntry) { refreshSession(true); } else { renderCart(); showModal(cartDialog, $('#table-help')); } });
  async function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = api('catalog').then(data => {
      if (!Array.isArray(data.items)) throw new Error('Invalid catalog');
      const next = new Map();
      for (const source of data.items) {
        if (!byWebId.has(source.webId) || typeof source.productId !== 'string' || !Number.isFinite(source.price) || source.price < 0 || source.available === false) continue;
        if (!next.has(source.webId)) next.set(source.webId, []);
        next.get(source.webId).push({...source, variants: Array.isArray(source.variants) ? source.variants : [], modifiers: Array.isArray(source.modifiers) ? source.modifiers : []});
      }
      posCatalog = next; catalogLoaded = true;
      let pricesChanged = false;
      for (const item of items) {
        const options = next.get(item.id) || [];
        if (options.length) { const minimum = Math.min(...options.map(source => source.price)); item.price = minimum; item.el.querySelector('.dish-price').textContent = (options.some(source => source.price !== minimum) ? 'Desde ' : '') + money(minimum); }
      }
      for (const line of cart) {
        if (!line.productId) {
          const options = next.get(line.webId) || [];
          if (options.length === 1 && validChoices(options[0], line.variantId, line.modifierIds || [])) { line.productId = options[0].productId; line.name = options[0].name; }
        }
        const source = catalogOption(line.productId);
        if (source && !pending) { const current = selectedPrice(source, line.variantId, line.modifierIds || [], line.unitPrice); if (Math.abs(current - line.unitPrice) > .001) pricesChanged = true; line.unitPrice = current; }
      }
      if (activeDish && dishDialog.open) { const options = next.get(activeDish.id) || []; if (!sourceChoice && options.length === 1) sourceChoice = options[0].productId; renderChoices(); updateDetail(); }
      persist(); renderMenu(); renderCart(); return pricesChanged;
    }).finally(() => { catalogPromise = null; });
    return catalogPromise;
  }
  async function refreshSession(handshake = false) {
    if (sessionChecking) return;
    sessionChecking = true;
    try {
      const data = await api('session', handshake && tableEntry ? {token: tableEntry} : undefined);
      if (!data.session || !data.session.tableLabel || !data.session.expiresAt) throw new Error('Invalid table session');
      session = data.session; tableEntry = '';
      if (pending && Array.isArray(data.orders)) { const confirmed = data.orders.find(order => order.requestId === pending.idempotencyKey && typeof order.id === 'string'); if (confirmed) { receipt = confirmed; pending = null; cart = []; persist(); setCartStatus(''); } }
      if (receipt && Array.isArray(data.orders)) { const latest = data.orders.find(order => order.id === receipt.id); if (latest) { receipt = latest; persist(); } }
      if (!activeSession()) { session = null; setCartStatus('El acceso de esta mesa terminó. Pide un nuevo acceso al equipo.'); }
      clearTimeout(pollTimer); if (session) pollTimer = setTimeout(() => refreshSession(), 10000);
    } catch (error) {
      if ([401, 403, 410].includes(error.status)) { session = null; tableEntry = ''; clearTimeout(pollTimer); if (handshake || cartDialog.open) setCartStatus(pending ? 'El acceso terminó y el envío anterior sigue sin confirmarse. Consulta al equipo antes de volver a pedir.' : 'Este acceso ya no está activo. Pide al equipo el acceso de tu mesa.'); }
      else { if (handshake) setCartStatus('No pudimos abrir tu mesa. Reintenta cuando tengas conexión.'); if (session) pollTimer = setTimeout(() => refreshSession(), 12000); }
    } finally { sessionChecking = false; renderSession(); }
  }
  function publicError(status) {
    if ([401, 403, 410].includes(status)) return 'Tu acceso de mesa terminó. Pide al equipo que abra un nuevo acceso.';
    if (status === 409) return 'Cambió la disponibilidad o el precio de una opción. Revisa tu pedido y confirma de nuevo.';
    if (status === 429) return 'Espera unos segundos antes de enviar otro pedido. Si necesitas ayuda, avísanos en barra.';
    if (status === 400 || status === 422) return 'Revisa las opciones y cantidades de tu pedido antes de enviarlo.';
    return 'No pudimos confirmar el envío. Reintenta este mismo pedido; conservamos la referencia para evitar duplicados.';
  }
  $('#submit-order').addEventListener('click', async () => {
    if (sending || !activeSession() || (pending?.sessionId && pending.sessionId !== session.id) || (!pending && !cartReady())) return;
    sending = true; setCartStatus('Comprobando tu mesa y tu pedido…'); renderCart();
    try {
      if (!pending) {
        await refreshSession();
        if (!activeSession()) { setCartStatus('Tu acceso de mesa terminó. Pide un nuevo acceso al equipo.'); return; }
        const pricesChanged = await loadCatalog();
        if (pricesChanged) { setCartStatus('Actualizamos el total con los precios de la cafetería. Revísalo y vuelve a confirmar.'); return; }
        if (!cartReady()) { setCartStatus('Una opción cambió. Revisa tu pedido antes de enviarlo.'); return; }
        pending = {sessionId: session.id, idempotencyKey: crypto.randomUUID(), items: cart.map(line => ({productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice, notes: line.notes, ...(line.variantId ? {variantId: line.variantId} : {}), ...(line.modifierIds?.length ? {modifierIds: line.modifierIds} : {})}))}; persist();
      }
      const data = await api('submit', {idempotencyKey: pending.idempotencyKey, items: pending.items});
      if (!data.order || typeof data.order.id !== 'string') throw new Error('Order confirmation missing');
      receipt = data.order; pending = null; cart = []; persist(); setCartStatus(''); renderMenu();
      track('menu_order_received', 'table-order');
      refreshSession();
    } catch (error) {
      const authEnded = [401, 403, 410].includes(error.status);
      const definitive = error.status >= 400 && error.status < 500 && error.status !== 429 && !error.data?.retrySame && !authEnded;
      if (definitive) { pending = null; if ([401, 403, 410].includes(error.status)) session = null; if (error.status === 409) await loadCatalog().catch(() => {}); persist(); }
      if (authEnded) session = null;
      setCartStatus(authEnded && pending ? 'El acceso terminó y el envío anterior sigue sin confirmarse. Consulta al equipo antes de volver a pedir.' : publicError(error.status));
    } finally { sending = false; renderSession(); }
  });
  function restoreLocation() {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const entry = fragment.get('mesa');
    if (entry) { tableEntry = entry; history.replaceState(null, '', location.pathname + location.search); refreshSession(true); return; }
    const hash = location.hash.slice(1); if (labels[hash]) { category = hash; taste = ''; search.value = ''; budget = false; } renderMenu();
  }
  $$('[data-event]').forEach(link => link.addEventListener('click', () => track(link.dataset.event, link.dataset.cta)));
  $('.menu-tools').hidden = false; root.classList.add('app-ready'); document.documentElement.classList.add('menu-enhanced');
  restoreLocation(); renderSession();
  window.addEventListener('hashchange', restoreLocation);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session) refreshSession(); });
  window.addEventListener('online', () => { loadCatalog().catch(() => {}); if (session || tableEntry) refreshSession(!!tableEntry); });
  const requested = new URL(location.href).searchParams.get('producto');
  if (byWebId.has(requested)) { const item = byWebId.get(requested); category = item.category; renderMenu(); openDish(item, item.el.querySelector('button')); }
  loadCatalog().catch(() => { if (activeSession()) setCartStatus('No se pudo consultar la disponibilidad. Reintenta cuando tengas conexión.'); });
  refreshSession(!!tableEntry);
})();
