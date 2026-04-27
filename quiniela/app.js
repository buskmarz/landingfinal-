import {
  createParticipant,
  getMatchesByPhase,
  getParticipantByFolio,
  getPhaseDeadline,
  getPhaseProgress,
  getPhases,
  getPredictionsByParticipantAndPhase,
  getRanking,
  isKnockoutPhase,
  isMatchLocked,
  savePredictions
} from './services/quinielaService.js';
import { trackEvent } from './services/analytics.js';

const phaseCardsEl = document.querySelector('#phase-cards');
const registerForm = document.querySelector('#register-form');
const registerSubmit = document.querySelector('#register-submit');
const acceptsTerms = document.querySelector('#acceptsTerms');
const registerSuccess = document.querySelector('#register-success');
const successTitle = document.querySelector('#success-title');
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
const rankingPhaseFilter = document.querySelector('#ranking-phase-filter');
const rankingSearch = document.querySelector('#ranking-search');
const phaseSelect = document.querySelector('#phase-select');

let latestCreatedFolio = '';
let loadedContext = { folio: '', phaseId: '' };

trackEvent('quiniela_view', { section: 'landing' });

renderPhaseCards();
renderPhaseSelect();
renderRanking();
bindEvents();

function bindEvents() {
  registerForm.addEventListener('submit', onRegisterSubmit);
  acceptsTerms.addEventListener('change', updateRegisterButtonState);
  copyFolioButton.addEventListener('click', onCopyFolio);
  predictionAccessForm.addEventListener('submit', onPredictionAccess);
  predictionForm.addEventListener('submit', (event) => onPredictionSubmit(event, { requireComplete: true }));
  saveProgressButton.addEventListener('click', () => saveCurrentPredictions({ requireComplete: false }));
  rankingPhaseFilter.addEventListener('change', renderRanking);
  rankingSearch.addEventListener('input', renderRanking);

  document.querySelectorAll('[data-track="quiniela_register_start"]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('quiniela_register_start', { source: 'hero' }));
  });
}

function renderPhaseCards() {
  const phases = getPhases();
  const activeFolio = loadedContext.folio || latestCreatedFolio;

  phaseCardsEl.innerHTML = phases.map((phase) => {
    const matches = getMatchesByPhase(phase.id);
    const progress = getPhaseProgress(activeFolio, phase.id);
    const deadline = getPhaseDeadline(phase.id);
    const visibleStatus = progress.complete ? 'completada' : phase.status;

    return `
      <article class="q-phase-card">
        <div>
          <span class="q-phase-status" data-status="${visibleStatus}">${normalizeStatusLabel(visibleStatus)}</span>
          <h3>${phase.name}</h3>
        </div>
        <dl class="q-phase-meta">
          <div><dt>Partidos</dt><dd>${matches.length}</dd></div>
          <div><dt>Límite</dt><dd>${deadline ? formatMatchDate(deadline) : 'Por confirmar'}</dd></div>
          <div><dt>Progreso</dt><dd>${progress.saved}/${progress.total || matches.length} predicciones</dd></div>
        </dl>
        <button
          type="button"
          class="q-btn q-btn-secondary"
          data-phase-select="${phase.id}"
          ${phase.status === 'cerrada' ? 'disabled aria-disabled="true"' : ''}
        >
          Registrar predicciones
        </button>
      </article>
    `;
  }).join('');

  phaseCardsEl.querySelectorAll('[data-phase-select]').forEach((button) => {
    button.addEventListener('click', () => {
      phaseSelect.value = button.dataset.phaseSelect;
      document.querySelector('#predicciones').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderPhaseSelect() {
  phaseSelect.innerHTML = getPhases()
    .filter((phase) => phase.status !== 'cerrada')
    .map((phase) => `<option value="${phase.id}">${phase.name}</option>`)
    .join('');
}

function renderRanking() {
  trackEvent('quiniela_ranking_view', { source: 'render' });

  const phaseFilter = rankingPhaseFilter.value;
  const query = rankingSearch.value.trim().toUpperCase();
  const ranking = getRanking()
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

  rankingBody.innerHTML = ranking.map((entry, index) => `
    <tr>
      <td><strong>#${index + 1}</strong></td>
      <td>${entry.participantFolio}</td>
      <td>${abbreviateName(entry.name || 'Participante')}</td>
      <td>${entry.displayPoints} pts</td>
      <td>${entry.exactScores || 0}</td>
      <td>${entry.completedPhasesCount || 0}</td>
    </tr>
  `).join('');
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

function onRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterErrors();

  const formData = new FormData(registerForm);
  const payload = {
    name: String(formData.get('name') || ''),
    whatsapp: String(formData.get('whatsapp') || ''),
    email: String(formData.get('email') || ''),
    participationType: String(formData.get('participationType') || ''),
    acceptsTerms: formData.get('acceptsTerms') === 'on',
    acceptsMarketing: formData.get('acceptsMarketing') === 'on'
  };

  const errors = validateRegisterPayload(payload);
  if (Object.keys(errors).length) {
    renderRegisterErrors(errors);
    return;
  }

  setRegisterLoading(true);
  window.setTimeout(() => {
    const participant = createParticipant(payload);
    latestCreatedFolio = participant.folio;

    successTitle.textContent = participant.folio;
    registerSuccess.classList.remove('q-hidden');
    registerForm.reset();
    updateRegisterButtonState();
    updateWhatsappLink(participant.folio);
    setRegisterLoading(false);

    trackEvent('quiniela_register_success', {
      folio: participant.folio,
      participationType: participant.participationType
    });

    renderPhaseCards();
    renderRanking();
  }, 250);
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

function onPredictionAccess(event) {
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

  const participant = getParticipantByFolio(folio);
  if (!participant) {
    predictionFeedback.textContent = 'No encontramos este folio. Revisa que esté escrito correctamente o pide ayuda en cafetería.';
    return;
  }

  const matches = getMatchesByPhase(phaseId);
  if (!matches.length) {
    predictionFeedback.textContent = 'Todavía no hay partidos cargados para esta fase.';
    return;
  }

  loadedContext = { folio, phaseId };
  predictionForm.classList.remove('q-hidden');
  predictionFeedback.textContent = `Folio validado: ${folio}. Captura tus marcadores.`;

  renderMatchInputs(folio, phaseId, matches);
  renderPhaseCards();
  trackEvent('quiniela_prediction_start', { folio, phaseId });
}

function renderMatchInputs(folio, phaseId, matches) {
  const existing = getPredictionsByParticipantAndPhase(folio, phaseId);
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

function saveCurrentPredictions({ requireComplete }) {
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

  const result = savePredictions(loadedContext.folio, loadedContext.phaseId, payload);
  predictionSaveFeedback.textContent = 'Tus marcadores quedaron guardados. Puedes editarlos hasta antes del inicio de cada partido.';

  trackEvent('quiniela_prediction_save', {
    folio: loadedContext.folio,
    phaseId: loadedContext.phaseId,
    savedCount: result.savedCount,
    blockedMatches: result.blockedMatches.length
  });

  renderPhaseCards();
  renderRanking();
  renderMatchInputs(loadedContext.folio, loadedContext.phaseId, matches);
}

function updateRegisterButtonState() {
  registerSubmit.disabled = !acceptsTerms.checked;
}

function setRegisterLoading(isLoading) {
  registerSubmit.disabled = isLoading || !acceptsTerms.checked;
  registerSubmit.textContent = isLoading ? 'Generando folio...' : 'Generar folio';
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
  if (!['digital', 'fisico', 'ambos'].includes(payload.participationType)) errors.participationType = 'Selecciona un método de participación.';
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
