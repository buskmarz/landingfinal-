import { MOCK_MATCHES, PHASES } from './data/mockData.js';
import { trackEvent } from './services/analytics.js';

const calendarHub = document.querySelector('.q-calendar-hub');
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
const registerForm = document.querySelector('#register-form');
const registerSubmit = document.querySelector('#register-submit');
const acceptsTerms = document.querySelector('#acceptsTerms');
const registerSuccess = document.querySelector('#register-success');
const successTitle = document.querySelector('#success-title');
const kitPrimaryAction = document.querySelector('#kit-primary-action');
const copyFolioButton = document.querySelector('#copy-folio');
const copyFeedback = document.querySelector('#copy-feedback');
const whatsappFolio = document.querySelector('#whatsapp-folio');
const predictionAccessForm = document.querySelector('#prediction-access-form');
const predictionForm = document.querySelector('#prediction-form');
const saveProgressButton = document.querySelector('#save-progress');
const predictionFeedback = document.querySelector('#prediction-access-feedback');
const predictionSaveFeedback = document.querySelector('#prediction-save-feedback');
const matchesContainer = document.querySelector('#matches-container');
const rankingBody = document.querySelector('#ranking-body');
const rankingPodium = document.querySelector('#ranking-podium');
const myRankingCard = document.querySelector('#my-ranking-card');
const rankingPhaseFilter = document.querySelector('#ranking-phase-filter');
const rankingSearch = document.querySelector('#ranking-search');
const phaseSelect = document.querySelector('#phase-select');
const predictionCount = document.querySelector('#prediction-count');

let latestCreatedFolio = '';
let loadedContext = { folio: '', phaseId: '' };
let currentFolioStatus = null;
let rankingEntries = [];
let kitFormStarted = false;
let activeHubTab = 'featured';
let selectedPhaseId = 'grupos-j1';
let selectedGroup = '';
let selectedVenue = '';
let featuredLimit = 6;
let matchdayLimit = 8;

trackEvent('quiniela_view', { section: 'landing' });

renderPhaseSelect();
renderCalendarHub();
renderGroups();
renderMexicoMatches();
renderMexicoVenues();
renderRanking();
hydrateFolioFromUrl();
bindEvents();

function bindEvents() {
  registerForm.addEventListener('submit', onRegisterSubmit);
  registerForm.addEventListener('input', () => {
    if (!kitFormStarted) {
      kitFormStarted = true;
      trackEvent('kit_form_started', {});
    }
    updateRegisterButtonState();
  });
  registerForm.addEventListener('change', updateRegisterButtonState);
  copyFolioButton.addEventListener('click', onCopyFolio);
  predictionAccessForm.addEventListener('submit', onPredictionAccess);
  predictionForm.addEventListener('submit', (event) => onPredictionSubmit(event, { requireComplete: true }));
  saveProgressButton.addEventListener('click', () => saveCurrentPredictions({ requireComplete: false }));
  rankingPhaseFilter.addEventListener('change', renderRanking);
  rankingSearch.addEventListener('input', renderRanking);
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
  calendarHub.addEventListener('click', onCalendarHubClick);
  groupsGrid.addEventListener('click', onGroupAction);
  mexicoMatches.addEventListener('click', onPublicMatchAction);
  mexicoVenues.addEventListener('click', onVenueAction);
  groupResults?.addEventListener('click', onPublicMatchAction);
  venueResults?.addEventListener('click', onPublicMatchAction);
  matchdayResults?.addEventListener('click', onPublicMatchAction);
  featuredResults?.addEventListener('click', onPublicMatchAction);

  document.querySelectorAll('[data-track="quiniela_register_start"]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('click_crear_folio', { source: 'hero' }));
  });

  document.querySelectorAll('[data-track="click_ver_calendario"]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('click_ver_calendario', { source: 'hero' }));
  });

  document.querySelectorAll('[data-track="click_ver_grupos"]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('click_ver_grupos', { source: 'hero' }));
  });
}

function hydrateFolioFromUrl() {
  const folio = new URLSearchParams(window.location.search).get('folio');
  if (!folio) return;
  const input = document.querySelector('#folio-input');
  if (input) input.value = folio.toUpperCase();
}

function renderCalendarHub() {
  renderFeaturedMatches();
  renderPhaseChips();
  renderMatchdayTab();
}

function setHubTab(tabName, options = {}) {
  activeHubTab = tabName;
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
  phaseChipsEl.innerHTML = getPhases().map((phase) => {
    const matches = getMatchesByPhase(phase.id);
    const status = matches.length ? phase.status : 'por-confirmar';
    const label = phase.name.replace('Fase de grupos - ', '').replace('Ronda de ', 'Ronda ');
    return `<button type="button" class="q-phase-chip ${phase.id === selectedPhaseId ? 'is-active' : ''}" data-phase-chip="${phase.id}"><span>${label}</span><small>${normalizeStatusLabel(status)}</small></button>`;
  }).join('');
}

function renderMatchdayTab() {
  const phase = getPhases().find((item) => item.id === selectedPhaseId) || getPhases()[0];
  const matches = getMatchesByPhase(phase.id);
  const progress = getPhaseProgress(loadedContext.folio || latestCreatedFolio, phase.id);
  const deadline = getPhaseDeadline(phase.id);
  const status = matches.length ? phase.status : 'por-confirmar';
  matchdaySummary.innerHTML = `
    <article><span class="q-phase-status" data-status="${status}">${normalizeStatusLabel(status)}</span><h4>${phase.name}</h4><p>${matches.length ? `${matches.length} partidos · límite ${formatMatchDate(deadline)}` : 'Cruces por confirmar.'}</p></article>
    <article><strong>${progress.saved}/${progress.total || matches.length}</strong><span>predicciones guardadas</span></article>
    <article><a class="q-btn q-btn-primary" href="#predicciones">${matches.length ? 'Registrar predicciones' : 'Disponible cuando se definan los cruces'}</a></article>`;
  matchdayResults.innerHTML = matches.slice(0, matchdayLimit).map(renderCompactMatchCard).join('') || '<p class="q-empty-state">Fase por confirmar.</p>';
  matchdayShowMore.hidden = matchdayLimit >= matches.length;
}

function renderGroups() {
  const groups = buildGroups();
  groupsGrid.innerHTML = Object.entries(groups).map(([group, teams]) => `
    <article class="q-group-card ${selectedGroup === group ? 'is-active' : ''}"><h3>Grupo ${group}</h3><ul>${teams.map((team) => `<li><span>${team.flag}</span>${team.name}</li>`).join('')}</ul><div class="q-card-actions"><button class="q-btn q-btn-secondary" type="button" data-group-filter="${group}">Ver partidos</button><button class="q-btn q-btn-primary" type="button" data-group-predict="${group}">Predecir grupo</button></div></article>`).join('');
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
  mexicoVenues.innerHTML = venues.map((venue) => `<article class="q-venue-card ${selectedVenue === venue.city ? 'is-active' : ''}"><span class="q-venue-mark" aria-hidden="true"></span><h3>${venue.city}</h3><p>${venue.stadiums || 'Sede por confirmar'}</p><strong>${venue.matches.length} partidos cargados</strong><button class="q-btn q-btn-secondary" type="button" data-venue-city="${venue.city}">Ver partidos</button></article>`).join('');
  renderVenueResults();
}

function renderVenueResults() {
  if (!selectedVenue) { venueResults.innerHTML = ''; return; }
  const matches = getMatches().filter((match) => match.hostCity === selectedVenue);
  venueResults.innerHTML = `<h4>Partidos en ${selectedVenue}</h4>` + matches.map(renderCompactMatchCard).join('');
}

function renderCompactMatchCard(match) {
  return `<article class="q-compact-match-card"><div class="q-compact-meta"><span>Grupo ${match.group}</span><span>${formatShortDate(match.matchDate)}</span></div><div class="q-compact-scoreline"><strong>${match.homeFlag || ''} ${match.homeTeam}</strong><span>vs</span><strong>${match.awayFlag || ''} ${match.awayTeam}</strong></div><p>${match.venue} · ${match.hostCity}</p><div class="q-compact-actions"><span>${loadedContext.folio ? 'Folio listo para capturar' : 'Activa tu kit para guardar marcador.'}</span><button class="q-btn q-btn-primary" type="button" data-predict-match="${match.id}" data-phase="${match.phase}">Predecir</button></div></article>`;
}

function onCalendarHubClick(event) {
  const phaseId = event.target.closest('[data-phase-chip]')?.dataset.phaseChip;
  if (phaseId) {
    selectedPhaseId = phaseId;
    phaseSelect.value = phaseId;
    matchdayLimit = 8;
    renderPhaseChips();
    renderMatchdayTab();
  }
}

function renderPhaseSelect() {
  phaseSelect.innerHTML = getPhases()
    .filter((phase) => phase.status !== 'cerrada' && getMatchesByPhase(phase.id).length > 0)
    .map((phase) => `<option value="${phase.id}">${phase.name}</option>`)
    .join('');
}

async function renderRanking() {
  trackEvent('quiniela_ranking_view', { source: 'render' });
  trackEvent('ranking_viewed', { source: 'render' });
  rankingEntries = await fetchRanking();

  const phaseFilter = rankingPhaseFilter.value;
  const query = rankingSearch.value.trim().toUpperCase();
  const ranking = rankingEntries
    .map((entry) => ({
      ...entry,
      displayPoints: phaseFilter === 'general'
        ? entry.totalPoints
        : phaseFilter === 'eliminatorias'
          ? getKnockoutPoints(entry.phasePoints)
          : entry.phasePoints?.[phaseFilter] || 0
    }))
    .filter((entry) => !query || entry.participantFolio.includes(query))
    .sort((a, b) => {
      if (b.displayPoints !== a.displayPoints) return b.displayPoints - a.displayPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if ((b.completedPhasesCount || 0) !== (a.completedPhasesCount || 0)) {
        return (b.completedPhasesCount || 0) - (a.completedPhasesCount || 0);
      }
      return new Date(a.earliestPredictionAt || a.createdAt || 0).getTime() - new Date(b.earliestPredictionAt || b.createdAt || 0).getTime();
    });

  renderPodium(ranking);
  renderMyRanking(ranking);

  if (!ranking.length) {
    rankingBody.innerHTML = '<tr><td colspan="6">El ranking aparecerá cuando los primeros folios estén activos.</td></tr>';
    renderPodium([]);
    renderMyRanking([]);
    return;
  }

  rankingBody.innerHTML = ranking.map((entry, index) => `
    <tr>
      <td data-label="Posición"><strong>#${index + 1}</strong></td>
      <td data-label="Folio">${entry.participantFolio}</td>
      <td data-label="Nombre">${abbreviateName(entry.name || 'Participante')}</td>
      <td data-label="Puntos">${entry.displayPoints} pts</td>
      <td data-label="Exactos">${entry.exactScores || 0}</td>
      <td data-label="Fases completas">${entry.completedPhasesCount || 0}</td>
    </tr>
  `).join('');
}

function renderMyRanking(ranking) {
  const folio = loadedContext.folio || latestCreatedFolio;
  const index = ranking.findIndex((entry) => entry.participantFolio === folio);

  if (!folio || index < 0) {
    myRankingCard.classList.add('q-hidden');
    myRankingCard.innerHTML = '';
    return;
  }

  const entry = ranking[index];
  myRankingCard.classList.remove('q-hidden');
  myRankingCard.innerHTML = `
    <strong>Tu posición</strong>
    <span>#${index + 1}</span>
    <p>${entry.participantFolio} · ${entry.displayPoints} pts · ${entry.exactScores || 0} exactos</p>
  `;
}

function renderPodium(ranking) {
  const top = ranking.slice(0, 3);
  if (!top.length) {
    rankingPodium.innerHTML = '';
    return;
  }

  rankingPodium.innerHTML = top.map((entry, index) => `
    <article class="q-podium-card ${index === 0 ? 'is-leader' : ''}">
      <span class="q-medal">${['1', '2', '3'][index]}</span>
      <p>${index === 0 ? 'Líder actual' : `Top ${index + 1}`}</p>
      <h3>${entry.participantFolio}</h3>
      <strong>${entry.displayPoints} pts</strong>
      <small>${entry.exactScores || 0} exactos · ${entry.completedPhasesCount || 0} fases</small>
    </article>
  `).join('');
}

async function onRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterErrors();

  const formData = new FormData(registerForm);
  const payload = {
    name: String(formData.get('name') || ''),
    whatsapp: String(formData.get('whatsapp') || ''),
    email: String(formData.get('email') || ''),
    participationType: String(formData.get('participationType') || ''),
    paymentMethod: String(formData.get('paymentMethod') || 'mercado_pago'),
    acceptsTerms: formData.get('acceptsTerms') === 'on',
    acceptsMarketing: formData.get('acceptsMarketing') === 'on'
  };

  const errors = validateRegisterPayload(payload);
  if (Object.keys(errors).length) {
    renderRegisterErrors(errors);
    return;
  }

  setRegisterLoading(true);
  try {
    const reservation = await apiFetch('/.netlify/functions/reserve-kit', { method: 'POST', body: payload });
    latestCreatedFolio = reservation.folioCode;
    trackEvent('kit_reserved', { folio: reservation.folioCode, paymentMethod: payload.paymentMethod });

    if (payload.paymentMethod === 'in_store') {
      showReservedKit(reservation.folioCode, { inStore: true });
      return;
    }

    const preference = await apiFetch('/.netlify/functions/create-mercadopago-preference', {
      method: 'POST',
      body: { participantId: reservation.participantId, folioCode: reservation.folioCode }
    });
    trackEvent('mercado_pago_checkout_started', { folio: reservation.folioCode, paymentId: preference.paymentId });
    showReservedKit(reservation.folioCode, { checkoutUrl: preference.init_point || preference.checkoutUrl });
    window.location.href = preference.init_point || preference.checkoutUrl;
  } catch (error) {
    registerSuccess.classList.add('q-hidden');
    renderRegisterErrors({ acceptsTerms: error.message || 'No pudimos reservar tu kit. Intenta de nuevo.' });
  } finally {
    setRegisterLoading(false);
  }
}

async function onCopyFolio() {
  if (!latestCreatedFolio) {
    copyFeedback.textContent = 'Primero genera un folio.';
    return;
  }

  try {
    await navigator.clipboard.writeText(latestCreatedFolio);
    copyFeedback.textContent = 'Folio copiado.';
  } catch (error) {
    copyFeedback.textContent = `No fue posible copiar automáticamente. Tu folio: ${latestCreatedFolio}`;
  }
}

async function onPredictionAccess(event) {
  event.preventDefault();
  predictionFeedback.textContent = '';
  predictionSaveFeedback.textContent = '';

  const formData = new FormData(predictionAccessForm);
  const folio = String(formData.get('folio') || '').trim().toUpperCase();
  const phaseId = String(formData.get('phase') || '');

  if (!folio) {
    predictionFeedback.textContent = 'Ingresa tu folio.';
    return;
  }

  const status = await fetchFolioStatus(folio);
  if (!status) {
    predictionFeedback.textContent = 'No encontramos este folio. Revisa el código o crea tu kit.';
    trackEvent('prediction_attempt_without_active_folio', { folio, reason: 'not_found' });
    return;
  }
  if (!status.canPredict) {
    const folioStatus = status.folioStatus || status.status;
    predictionFeedback.textContent = folioStatus === 'pending_payment'
      ? 'Tu folio está reservado. Completa tu pago para activarlo.'
      : 'Para guardar marcadores necesitas activar tu Kit Better Mood Futbolero.';
    showPredictionBlockModal(predictionFeedback.textContent);
    trackEvent('prediction_attempt_without_active_folio', { folio, status: folioStatus });
    return;
  }

  const matches = getMatchesByPhase(phaseId);
  if (!matches.length) {
    predictionFeedback.textContent = 'Todavía no hay partidos cargados para esta fase.';
    return;
  }

  currentFolioStatus = status;
  loadedContext = { folio, phaseId };
  predictionForm.classList.remove('q-hidden');
  predictionFeedback.textContent = `Tu folio está activo. Ya puedes registrar marcadores.`;

  await renderMatchInputs(folio, phaseId, matches);
  renderCalendarHub();
  trackEvent('quiniela_prediction_start', { folio, phaseId });
}

async function renderMatchInputs(folio, phaseId, matches) {
  const existing = await fetchPredictions(folio, phaseId);
  const existingByMatchId = Object.fromEntries(existing.map((item) => [item.matchId, item]));
  const knockout = isKnockoutPhase(phaseId);

  matchesContainer.innerHTML = matches.map((match) => {
    const previous = existingByMatchId[match.id];
    const locked = isMatchLocked(match.matchDate, match.status);
    const homeValue = previous ? previous.predictedHomeScore ?? previous.homeScorePrediction : '';
    const awayValue = previous ? previous.predictedAwayScore ?? previous.awayScorePrediction : '';
    const advancingTeamId = previous?.advancingTeamId || '';

    return `
      <article class="q-match-card">
        <div class="q-match-head">
          <div>
            <strong class="q-match-title">
              <span>${match.homeFlag || ''} ${match.homeTeam}</span>
              <span class="q-versus">vs</span>
              <span>${match.awayFlag || ''} ${match.awayTeam}</span>
            </strong>
            <div><small>Grupo ${match.group} · ${formatMatchDate(match.matchDate)} · ${match.venue}, ${match.hostCity}</small></div>
          </div>
          <span class="q-phase-status" data-status="${locked ? 'cerrada' : 'abierta'}">${locked ? 'Cerrada' : 'Abierta'}</span>
        </div>

        <div class="q-scoreboard">
          <label>
            <span>${match.homeFlag || ''}</span>
            <strong>${match.homeTeam}</strong>
            <input type="number" min="0" max="20" inputmode="numeric" name="home-${match.id}" value="${homeValue}" ${locked ? 'disabled' : ''} />
          </label>
          <span class="q-score-divider">vs</span>
          <label>
            <span>${match.awayFlag || ''}</span>
            <strong>${match.awayTeam}</strong>
            <input type="number" min="0" max="20" inputmode="numeric" name="away-${match.id}" value="${awayValue}" ${locked ? 'disabled' : ''} />
          </label>
        </div>

        ${knockout ? renderAdvanceSelector(match, advancingTeamId, locked) : ''}
      </article>
    `;
  }).join('');
  updatePredictionCount();
  matchesContainer.querySelectorAll('input').forEach((input) => input.addEventListener('input', updatePredictionCount));
}

function renderAdvanceSelector(match, selectedValue, locked) {
  return `
    <fieldset class="q-advance-selector">
      <legend>¿Quién avanza?</legend>
      <label><input type="radio" name="advance-${match.id}" value="home" ${selectedValue === 'home' ? 'checked' : ''} ${locked ? 'disabled' : ''} /> ${match.homeFlag || ''} ${match.homeTeam}</label>
      <label><input type="radio" name="advance-${match.id}" value="away" ${selectedValue === 'away' ? 'checked' : ''} ${locked ? 'disabled' : ''} /> ${match.awayFlag || ''} ${match.awayTeam}</label>
    </fieldset>
  `;
}

function onPredictionSubmit(event, options) {
  event.preventDefault();
  saveCurrentPredictions(options);
}

async function saveCurrentPredictions({ requireComplete }) {
  predictionSaveFeedback.textContent = '';

  const matches = getMatchesByPhase(loadedContext.phaseId);
  const payload = [];
  const knockout = isKnockoutPhase(loadedContext.phaseId);

  for (const match of matches) {
    const homeInput = predictionForm.querySelector(`[name="home-${match.id}"]`);
    const awayInput = predictionForm.querySelector(`[name="away-${match.id}"]`);

    if (!homeInput || !awayInput || homeInput.disabled || awayInput.disabled) continue;

    const homeRaw = homeInput.value;
    const awayRaw = awayInput.value;

    if (!homeRaw || !awayRaw) {
      if (requireComplete) {
        predictionSaveFeedback.textContent = 'Completa todos los marcadores de la fase o usa Guardar avance.';
        return;
      }
      continue;
    }

    const homeValue = Number(homeRaw);
    const awayValue = Number(awayRaw);

    if (!Number.isFinite(homeValue) || !Number.isFinite(awayValue) || homeValue < 0 || awayValue < 0) {
      predictionSaveFeedback.textContent = 'No se aceptan números negativos ni valores inválidos.';
      return;
    }

    const advancingTeamId = predictionForm.querySelector(`[name="advance-${match.id}"]:checked`)?.value || null;
    if (knockout && homeValue === awayValue && !advancingTeamId) {
      predictionSaveFeedback.textContent = 'En eliminatorias, si marcas empate debes elegir quién avanza.';
      return;
    }

    payload.push({
      matchId: match.id,
      predictedHomeScore: homeValue,
      predictedAwayScore: awayValue,
      advancingTeamId
    });
  }

  if (!payload.length) {
    predictionSaveFeedback.textContent = 'No hay predicciones editables para guardar.';
    return;
  }

  let result;
  try {
    result = await apiFetch('/.netlify/functions/save-predictions', {
      method: 'POST',
      body: { folioCode: loadedContext.folio, phaseId: loadedContext.phaseId, predictions: payload }
    });
  } catch (error) {
    predictionSaveFeedback.textContent = error.message || 'No pudimos guardar tus marcadores.';
    if (/folio|activo|activar/i.test(predictionSaveFeedback.textContent)) showPredictionBlockModal('Para guardar marcadores necesitas activar tu Kit Better Mood Futbolero.');
    return;
  }
  predictionSaveFeedback.textContent = 'Tus marcadores quedaron guardados. Puedes editarlos hasta antes del inicio de cada partido.';

  const progress = getPhaseProgress(loadedContext.folio, loadedContext.phaseId);
  if (progress.complete) trackEvent('fase_completada', { folio: loadedContext.folio, phaseId: loadedContext.phaseId });
  trackEvent('quiniela_prediction_save', {
    folio: loadedContext.folio,
    phaseId: loadedContext.phaseId,
    savedCount: result.savedCount,
    blockedMatches: result.blockedMatches.length
  });
  trackEvent('prediccion_guardada', { folio: loadedContext.folio, phaseId: loadedContext.phaseId, savedCount: result.savedCount });
  trackEvent('prediction_saved', { folio: loadedContext.folio, phaseId: loadedContext.phaseId, savedCount: result.savedCount });

  renderCalendarHub();
  renderRanking();
  renderMatchInputs(loadedContext.folio, loadedContext.phaseId, matches);
}

function onPublicMatchAction(event) {
  const matchId = event.target.dataset.predictMatch;
  if (!matchId) return;

  const phaseId = event.target.dataset.phase;
  trackEvent('click_predecir_marcador', { matchId, phaseId });
  phaseSelect.value = phaseId;

  if (!latestCreatedFolio && !loadedContext.folio) {
    document.querySelector('#registro').scrollIntoView({ behavior: 'smooth', block: 'start' });
    predictionFeedback.textContent = 'Primero crea tu folio para guardar tus predicciones.';
    return;
  }

  document.querySelector('#predicciones').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onGroupAction(event) {
  const group = event.target.dataset.groupFilter || event.target.dataset.groupPredict;
  if (!group) return;

  selectedGroup = group;
  setHubTab('groups', { scroll: true });
  renderGroups();

  if (event.target.dataset.groupPredict) {
    trackEvent('click_predecir_marcador', { group });
  }
}

function onVenueAction(event) {
  const city = event.target.dataset.venueCity;
  if (!city) return;

  selectedVenue = city;
  setHubTab('venues', { scroll: true });
  renderMexicoVenues();
}

function updatePredictionCount() {
  const matches = getMatchesByPhase(loadedContext.phaseId);
  let captured = 0;
  matches.forEach((match) => {
    const homeInput = predictionForm.querySelector(`[name="home-${match.id}"]`);
    const awayInput = predictionForm.querySelector(`[name="away-${match.id}"]`);
    if (homeInput?.value !== '' && awayInput?.value !== '') captured += 1;
  });
  predictionCount.textContent = `${captured}/${matches.length} predicciones capturadas`;
}

function buildGroups() {
  return getMatches().reduce((groups, match) => {
    groups[match.group] = groups[match.group] || [];
    [
      { name: match.homeTeam, flag: match.homeFlag },
      { name: match.awayTeam, flag: match.awayFlag }
    ].forEach((team) => {
      if (!groups[match.group].some((entry) => entry.name === team.name)) groups[match.group].push(team);
    });
    return groups;
  }, {});
}

function getMatchStatusLabel(match) {
  const today = new Date().toISOString().slice(0, 10);
  const matchDay = match.matchDate.slice(0, 10);
  if (match.status === 'finalizado') return 'Finalizado';
  if (matchDay === today) return 'Hoy';
  return 'Próximo';
}

function getHostCountry(city) {
  if (['Ciudad de México', 'Guadalajara', 'Monterrey'].includes(city)) return 'México';
  if (['Toronto', 'Vancouver'].includes(city)) return 'Canadá';
  return 'Estados Unidos';
}

function updateRegisterButtonState() {
  registerSubmit.disabled = !acceptsTerms.checked || !registerForm.checkValidity();
}

function setRegisterLoading(isLoading) {
  registerSubmit.disabled = isLoading || !acceptsTerms.checked || !registerForm.checkValidity();
  registerSubmit.textContent = isLoading ? 'Reservando kit...' : 'Continuar al pago';
}

function updateWhatsappLink(folio) {
  const message = encodeURIComponent(`Mi folio de la Quiniela Better Mood 2026 es ${folio}.`);
  whatsappFolio.href = `https://wa.me/?text=${message}`;
}

function clearRegisterErrors() {
  ['name', 'whatsapp', 'email', 'participationType', 'acceptsTerms'].forEach((key) => {
    const el = document.querySelector(`#${key}-error`);
    if (el) el.textContent = '';
  });
}

function renderRegisterErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.querySelector(`#${field}-error`);
    if (errorEl) errorEl.textContent = message;
  });
}

function validateRegisterPayload(payload) {
  const errors = {};

  if (payload.name.trim().length < 4) errors.name = 'Ingresa tu nombre completo.';
  if (!/^\+?[0-9\s()-]{8,}$/.test(payload.whatsapp.trim())) errors.whatsapp = 'Ingresa un WhatsApp válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) errors.email = 'Ingresa un email válido.';
  if (!['digital', 'physical', 'both'].includes(payload.participationType)) errors.participationType = 'Selecciona un método de participación.';
  if (!['mercado_pago', 'in_store'].includes(payload.paymentMethod)) errors.participationType = 'Selecciona una forma de pago.';
  if (!payload.acceptsTerms) errors.acceptsTerms = 'Debes aceptar términos y condiciones para continuar.';

  return errors;
}

function getKnockoutPoints(phasePoints = {}) {
  return Object.entries(phasePoints)
    .filter(([phaseId]) => isKnockoutPhase(phaseId))
    .reduce((sum, [, points]) => sum + points, 0);
}

function normalizeStatusLabel(status) {
  if (status === 'abierta') return 'Abierta';
  if (status === 'cerrada') return 'Cerrada';
  if (status === 'completada') return 'Completada';
  if (status === 'por-confirmar') return 'Por confirmar';
  return 'Próximamente';
}

function abbreviateName(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].slice(0, 1)}.`;
}

function formatMatchDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatShortDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getMexicoMatches() {
  return getMatches().filter((match) => match.homeTeam === 'México' || match.awayTeam === 'México');
}

function uniqueMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    if (!match || seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getPhases() {
  return PHASES;
}

function getMatches() {
  return MOCK_MATCHES;
}

function getMatchesByPhase(phaseId) {
  return getMatches().filter((match) => match.phase === phaseId);
}

function isKnockoutPhase(phaseId) {
  return !String(phaseId).startsWith('grupos-');
}

function isMatchLocked(matchDate, status = 'open') {
  return ['locked', 'finished', 'cerrada', 'finalizado'].includes(status) || new Date(matchDate).getTime() <= Date.now();
}

function getPhaseDeadline(phaseId) {
  const matches = getMatchesByPhase(phaseId);
  if (!matches.length) return null;
  return matches.map((match) => match.matchDate).sort()[0];
}

function getPhaseProgress(folio, phaseId) {
  const total = getMatchesByPhase(phaseId).length;
  if (!folio || loadedContext.folio !== folio || loadedContext.phaseId !== phaseId) return { saved: 0, total, complete: false };
  const captured = [...predictionForm.querySelectorAll('input[type="number"]')]
    .filter((input) => input.value !== '')
    .length / 2;
  return { saved: Math.floor(captured), total, complete: total > 0 && Math.floor(captured) >= total };
}

async function fetchRanking() {
  try {
    const response = await apiFetch('/.netlify/functions/ranking?phase=general');
    return response.ranking || [];
  } catch (error) {
    console.warn('Ranking fallback:', error);
    return [];
  }
}

async function fetchFolioStatus(folio) {
  try {
    return await apiFetch(`/.netlify/functions/folio-status?folio=${encodeURIComponent(folio)}`);
  } catch (error) {
    return null;
  }
}

async function fetchPredictions(folio, phaseId) {
  try {
    const response = await apiFetch(`/.netlify/functions/get-predictions?folio=${encodeURIComponent(folio)}&phaseId=${encodeURIComponent(phaseId)}`);
    return response.predictions || [];
  } catch (error) {
    return [];
  }
}

async function apiFetch(url, options = {}) {
  const fetchOptions = { ...options };
  fetchOptions.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string') fetchOptions.body = JSON.stringify(options.body);

  const response = await fetch(url, fetchOptions);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Error de comunicación con el servidor.');
  return payload;
}

function showReservedKit(folio, options = {}) {
  successTitle.textContent = folio;
  registerSuccess.classList.remove('q-hidden');
  registerForm.reset();
  updateRegisterButtonState();
  updateWhatsappLink(folio);

  const eyebrow = registerSuccess.querySelector('.q-eyebrow');
  const body = registerSuccess.querySelector('p:not(.q-eyebrow)');
  if (eyebrow) eyebrow.textContent = options.inStore ? 'Tu kit está reservado' : 'Tu kit está reservado';
  if (body) {
    body.textContent = options.inStore
      ? 'Paga tu Kit Better Mood Futbolero en barra. Nuestro equipo activará tu folio.'
      : 'Completa el pago de $99 MXN en Mercado Pago para activar tu folio automáticamente.';
  }
  if (kitPrimaryAction) {
    kitPrimaryAction.textContent = options.inStore ? 'Ver predicciones' : 'Pagar con Mercado Pago';
    kitPrimaryAction.href = options.checkoutUrl || '#predicciones';
    kitPrimaryAction.toggleAttribute('target', Boolean(options.checkoutUrl));
    if (options.checkoutUrl) kitPrimaryAction.rel = 'noopener';
  }

  trackEvent('quiniela_register_success', { folio, status: 'pending_payment' });
  trackEvent('folio_generado', { folio, status: 'reserved' });
  renderCalendarHub();
}

function showPredictionBlockModal(message) {
  const existing = document.querySelector('.q-modal-backdrop');
  if (existing) existing.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'q-modal-backdrop';
  backdrop.innerHTML = `
    <section class="q-modal" role="dialog" aria-modal="true" aria-labelledby="prediction-block-title">
      <h3 id="prediction-block-title">Folio activo requerido</h3>
      <p>${message}</p>
      <div class="q-inline-actions">
        <a class="q-btn q-btn-primary" href="#registro">Comprar kit y activar folio</a>
        <button class="q-btn q-btn-secondary" type="button" data-close-modal>Cerrar</button>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector('[data-close-modal]').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
}
