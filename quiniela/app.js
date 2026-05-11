import { MOCK_MATCHES, PHASES } from './data/mockData.js';
import { trackEvent } from './services/analytics.js';

const hubTabs = document.querySelectorAll('[data-calendar-tab]');
const hubPanels = document.querySelectorAll('[data-calendar-panel]');
const featuredResults = document.querySelector('#featured-results');
const featuredShowMore = document.querySelector('#featured-show-more');
const phaseChipsEl = document.querySelector('#phase-chips');
const matchdaySummary = document.querySelector('#matchday-summary');
const matchdayResults = document.querySelector('#matchday-results');
const matchdayShowMore = document.querySelector('#matchday-show-more');
const groupsGrid = document.querySelector('#groups-grid');
const groupResults = document.querySelector('#group-results');
const mexicoMatches = document.querySelector('#mexico-matches');
const mexicoVenues = document.querySelector('#mexico-venues');
const venueResults = document.querySelector('#venue-results');
const heroMexicoCta = document.querySelector('#hero-mexico-cta');

let selectedPhaseId = 'grupos-j1';
let selectedGroup = '';
let selectedVenue = '';
let featuredLimit = 6;
let matchdayLimit = 8;

trackEvent('calendario_futbolero_view', { source: 'quiniela_route_info' });

bindEvents();
renderCalendar();

function bindEvents() {
  hubTabs.forEach((tab) => tab.addEventListener('click', () => setHubTab(tab.dataset.calendarTab)));
  document.querySelectorAll('[data-hub-tab-jump]').forEach((button) => {
    button.addEventListener('click', () => setHubTab(button.dataset.hubTabJump, { scroll: true }));
  });
  heroMexicoCta?.addEventListener('click', () => setHubTab('mexico', { scroll: true }));
  featuredShowMore?.addEventListener('click', () => {
    featuredLimit += 6;
    renderFeaturedMatches();
  });
  matchdayShowMore?.addEventListener('click', () => {
    matchdayLimit += 8;
    renderMatchdayTab();
  });
  phaseChipsEl?.addEventListener('click', (event) => {
    const phaseId = event.target.closest('[data-phase-chip]')?.dataset.phaseChip;
    if (!phaseId) return;
    selectedPhaseId = phaseId;
    matchdayLimit = 8;
    renderPhaseChips();
    renderMatchdayTab();
    trackEvent('calendario_filtrado', { filter: 'phase', value: phaseId });
  });
  groupsGrid?.addEventListener('click', (event) => {
    const group = event.target.closest('[data-group-filter]')?.dataset.groupFilter;
    if (!group) return;
    selectedGroup = selectedGroup === group ? '' : group;
    renderGroups();
    trackEvent('calendario_filtrado', { filter: 'group', value: group });
  });
  mexicoVenues?.addEventListener('click', (event) => {
    const city = event.target.closest('[data-venue-city]')?.dataset.venueCity;
    if (!city) return;
    selectedVenue = selectedVenue === city ? '' : city;
    renderMexicoVenues();
    trackEvent('calendario_filtrado', { filter: 'venue', value: city });
  });
}

function renderCalendar() {
  renderFeaturedMatches();
  renderPhaseChips();
  renderMatchdayTab();
  renderGroups();
  renderMexicoMatches();
  renderMexicoVenues();
}

function setHubTab(tabName, options = {}) {
  hubTabs.forEach((tab) => {
    const isActive = tab.dataset.calendarTab === tabName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  hubPanels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.calendarPanel === tabName));
  if (options.scroll) document.querySelector('#calendario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderFeaturedMatches() {
  const mexico = getMexicoMatches()[0];
  const today = getMatches().filter((match) => getMatchStatusLabel(match) === 'Hoy');
  const upcoming = getMatches().filter((match) => new Date(match.matchDate).getTime() > Date.now());
  const list = uniqueMatches([mexico, ...today, ...upcoming]);
  featuredResults.innerHTML = list.slice(0, featuredLimit).map(renderCompactMatchCard).join('');
  featuredShowMore.hidden = featuredLimit >= list.length;
}

function renderPhaseChips() {
  phaseChipsEl.innerHTML = PHASES.map((phase) => {
    const matches = getMatchesByPhase(phase.id);
    const status = matches.length ? phase.status : 'por-confirmar';
    const label = phase.name.replace('Fase de grupos - ', '').replace('Ronda de ', 'Ronda ');
    return `<button type="button" class="q-phase-chip ${phase.id === selectedPhaseId ? 'is-active' : ''}" data-phase-chip="${phase.id}"><span>${label}</span><small>${normalizeStatusLabel(status)}</small></button>`;
  }).join('');
}

function renderMatchdayTab() {
  const phase = PHASES.find((item) => item.id === selectedPhaseId) || PHASES[0];
  const matches = getMatchesByPhase(phase.id);
  const deadline = getPhaseDeadline(phase.id);
  const status = matches.length ? phase.status : 'por-confirmar';
  matchdaySummary.innerHTML = `
    <article><span class="q-phase-status" data-status="${status}">${normalizeStatusLabel(status)}</span><h4>${phase.name}</h4><p>${matches.length ? `${matches.length} partidos · primera fecha ${formatMatchDate(deadline)}` : 'Cruces por confirmar.'}</p></article>
    <article><strong>${matches.length}</strong><span>partidos disponibles</span></article>
    <article><a class="q-btn q-btn-secondary" href="/#quick-order">Pedir café para el partido</a></article>`;
  matchdayResults.innerHTML = matches.slice(0, matchdayLimit).map(renderCompactMatchCard).join('') || '<p class="q-empty-state">Fase por confirmar. Actualizaremos esta vista cuando existan cruces definidos.</p>';
  matchdayShowMore.hidden = matchdayLimit >= matches.length;
}

function renderGroups() {
  const groups = buildGroups();
  groupsGrid.innerHTML = Object.entries(groups).map(([group, teams]) => `
    <article class="q-group-card ${selectedGroup === group ? 'is-active' : ''}"><h3>Grupo ${group}</h3><ul>${teams.map((team) => `<li><span>${team.flag}</span>${team.name}</li>`).join('')}</ul><div class="q-card-actions"><button class="q-btn q-btn-secondary" type="button" data-group-filter="${group}">${selectedGroup === group ? 'Ocultar partidos' : 'Ver partidos'}</button></div></article>`).join('');
  renderGroupResults();
}

function renderGroupResults() {
  if (!selectedGroup) { groupResults.innerHTML = ''; return; }
  const matches = getMatches().filter((match) => match.group === selectedGroup);
  groupResults.innerHTML = `<h4>Partidos del Grupo ${selectedGroup}</h4>` + matches.map(renderCompactMatchCard).join('');
}

function renderMexicoMatches() {
  mexicoMatches.innerHTML = getMexicoMatches().map(renderCompactMatchCard).join('');
}

function renderMexicoVenues() {
  const venues = ['Ciudad de México', 'Guadalajara', 'Monterrey'].map((city) => {
    const matches = getMatches().filter((match) => match.hostCity === city);
    const stadiums = [...new Set(matches.map((match) => match.venue))].join(' / ');
    return { city, matches, stadiums };
  });
  mexicoVenues.innerHTML = venues.map((venue) => `<article class="q-venue-card ${selectedVenue === venue.city ? 'is-active' : ''}"><span class="q-venue-mark" aria-hidden="true"></span><h3>${venue.city}</h3><p>${venue.stadiums || 'Sede por confirmar'}</p><strong>${venue.matches.length} partidos cargados</strong><button class="q-btn q-btn-secondary" type="button" data-venue-city="${venue.city}">${selectedVenue === venue.city ? 'Ocultar partidos' : 'Ver partidos'}</button></article>`).join('');
  renderVenueResults();
}

function renderVenueResults() {
  if (!selectedVenue) { venueResults.innerHTML = ''; return; }
  const matches = getMatches().filter((match) => match.hostCity === selectedVenue);
  venueResults.innerHTML = `<h4>Partidos en ${selectedVenue}</h4>` + matches.map(renderCompactMatchCard).join('');
}

function renderCompactMatchCard(match) {
  return `<article class="q-compact-match-card"><div class="q-compact-meta"><span>Grupo ${match.group}</span><span>${formatShortDate(match.matchDate)}</span></div><div class="q-compact-scoreline"><strong>${match.homeFlag || ''} ${match.homeTeam}</strong><span>vs</span><strong>${match.awayFlag || ''} ${match.awayTeam}</strong></div><p>${formatMatchDate(match.matchDate)} · ${match.venue} · ${match.hostCity}</p><div class="q-compact-actions"><span>${getMatchStatusLabel(match)}</span><a class="q-btn q-btn-secondary" href="/#quick-order">Café para este partido</a></div></article>`;
}

function getMatches() {
  return [...MOCK_MATCHES].sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
}

function getMatchesByPhase(phaseId) {
  return getMatches().filter((match) => match.phase === phaseId || match.phaseId === phaseId);
}

function getMexicoMatches() {
  return getMatches().filter((match) => /México/i.test(`${match.homeTeam} ${match.awayTeam}`));
}

function buildGroups() {
  return getMatches().reduce((acc, match) => {
    acc[match.group] ||= [];
    addTeam(acc[match.group], match.homeTeam, match.homeFlag);
    addTeam(acc[match.group], match.awayTeam, match.awayFlag);
    return acc;
  }, {});
}

function addTeam(list, name, flag) {
  if (!list.some((team) => team.name === name)) list.push({ name, flag });
}

function uniqueMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    if (!match || seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

function getPhaseDeadline(phaseId) {
  const matches = getMatchesByPhase(phaseId);
  return matches[0]?.matchDate || '2026-06-11T13:00:00-06:00';
}

function getMatchStatusLabel(match) {
  const now = Date.now();
  const start = new Date(match.matchDate).getTime();
  const diff = start - now;
  if (Math.abs(diff) < 1000 * 60 * 60 * 12) return 'Hoy';
  if (diff < 0) return 'Finalizado';
  return 'Próximo';
}

function normalizeStatusLabel(status) {
  return ({ abierta: 'Disponible', proximamente: 'Próximamente', cerrada: 'Cerrada', 'por-confirmar': 'Por confirmar' })[status] || status;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatMatchDate(value) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
