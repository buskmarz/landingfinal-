import {
  createParticipant,
  getMatchesByPhase,
  getParticipantByFolio,
  getPhases,
  getPredictionsByParticipantAndPhase,
  getRanking,
  isMatchLocked,
  savePredictions
} from './services/quinielaService.js';
import { trackEvent } from './services/analytics.js';

const phaseCardsEl = document.querySelector('#phase-cards');
const registerForm = document.querySelector('#register-form');
const registerSuccess = document.querySelector('#register-success');
const successTitle = document.querySelector('#success-title');
const copyFolioButton = document.querySelector('#copy-folio');
const copyFeedback = document.querySelector('#copy-feedback');
const predictionAccessForm = document.querySelector('#prediction-access-form');
const predictionForm = document.querySelector('#prediction-form');
const predictionFeedback = document.querySelector('#prediction-access-feedback');
const predictionSaveFeedback = document.querySelector('#prediction-save-feedback');
const matchesContainer = document.querySelector('#matches-container');
const rankingBody = document.querySelector('#ranking-body');
const phaseSelect = document.querySelector('#phase-select');

let latestCreatedFolio = '';
let loadedContext = {
  folio: '',
  phaseId: ''
};

trackEvent('quiniela_view', { section: 'landing' });

renderPhaseCards();
renderPhaseSelect();
renderRanking();
bindEvents();

function bindEvents() {
  registerForm.addEventListener('submit', onRegisterSubmit);
  copyFolioButton.addEventListener('click', onCopyFolio);
  predictionAccessForm.addEventListener('submit', onPredictionAccess);
  predictionForm.addEventListener('submit', onPredictionSubmit);

  document.querySelectorAll('[data-track="quiniela_register_start"]').forEach((element) => {
    element.addEventListener('click', () => trackEvent('quiniela_register_start', { source: 'hero' }));
  });
}

function renderPhaseCards() {
  const phases = getPhases();

  phaseCardsEl.innerHTML = phases
    .map(
      (phase) => `
      <article class="q-phase-card">
        <h3>${phase.name}</h3>
        <span class="q-phase-status" data-status="${phase.status}">${normalizeStatusLabel(phase.status)}</span>
        <button
          type="button"
          class="q-btn q-btn-secondary"
          data-phase-select="${phase.id}"
          ${phase.status === 'cerrada' ? 'disabled aria-disabled="true"' : ''}
        >
          Registrar predicciones
        </button>
      </article>
    `
    )
    .join('');

  phaseCardsEl.querySelectorAll('[data-phase-select]').forEach((button) => {
    button.addEventListener('click', () => {
      phaseSelect.value = button.dataset.phaseSelect;
      document.querySelector('#predicciones').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderPhaseSelect() {
  const phases = getPhases();
  phaseSelect.innerHTML = phases
    .filter((phase) => phase.status !== 'cerrada')
    .map((phase) => `<option value="${phase.id}">${phase.name}</option>`)
    .join('');
}

function renderRanking() {
  trackEvent('quiniela_ranking_view', { source: 'initial_render' });

  const ranking = getRanking();

  rankingBody.innerHTML = ranking
    .map((entry, index) => {
      const shortName = abbreviateName(entry.name || 'Participante');
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${entry.participantFolio}</td>
          <td>${shortName}</td>
          <td>${entry.totalPoints} pts</td>
          <td>${entry.exactScores}</td>
        </tr>
      `;
    })
    .join('');
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

  const participant = createParticipant(payload);
  latestCreatedFolio = participant.folio;

  successTitle.textContent = `Tu folio es ${participant.folio}`;
  registerSuccess.classList.remove('q-hidden');
  registerForm.reset();

  trackEvent('quiniela_register_success', {
    folio: participant.folio,
    participationType: participant.participationType
  });

  renderRanking();
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
    predictionFeedback.textContent = 'No encontramos ese folio.';
    return;
  }

  const matches = getMatchesByPhase(phaseId);
  if (!matches.length) {
    predictionFeedback.textContent = 'No hay partidos disponibles para esta fase.';
    return;
  }

  loadedContext = { folio, phaseId };
  predictionForm.classList.remove('q-hidden');
  predictionFeedback.textContent = `Folio validado: ${folio}. Completa tus marcadores.`;

  renderMatchInputs(folio, phaseId, matches);
  trackEvent('quiniela_prediction_start', { folio, phaseId });
}

function renderMatchInputs(folio, phaseId, matches) {
  const existing = getPredictionsByParticipantAndPhase(folio, phaseId);
  const existingByMatchId = Object.fromEntries(existing.map((item) => [item.matchId, item]));

  matchesContainer.innerHTML = matches
    .map((match) => {
      const previous = existingByMatchId[match.id];
      const locked = isMatchLocked(match.matchDate);
      const homeValue = previous ? previous.predictedHomeScore : '';
      const awayValue = previous ? previous.predictedAwayScore : '';

      return `
      <article class="q-match-card">
        <div class="q-match-head">
          <div>
            <strong>${match.homeTeam} vs ${match.awayTeam}</strong>
            <div><small>Fecha: ${formatMatchDate(match.matchDate)}</small></div>
          </div>
          <span class="q-phase-status" data-status="${locked ? 'cerrada' : 'abierta'}">${locked ? 'Cerrada' : 'Abierta'}</span>
        </div>

        <div class="q-score-grid">
          <label>
            ${match.homeTeam}
            <input type="number" min="0" max="20" inputmode="numeric" name="home-${match.id}" value="${homeValue}" ${locked ? 'disabled' : ''} required />
          </label>
          <strong>-</strong>
          <label>
            ${match.awayTeam}
            <input type="number" min="0" max="20" inputmode="numeric" name="away-${match.id}" value="${awayValue}" ${locked ? 'disabled' : ''} required />
          </label>
        </div>
      </article>
      `;
    })
    .join('');
}

function onPredictionSubmit(event) {
  event.preventDefault();
  predictionSaveFeedback.textContent = '';

  const matches = getMatchesByPhase(loadedContext.phaseId);
  const payload = [];

  for (const match of matches) {
    const homeInput = predictionForm.querySelector(`[name="home-${match.id}"]`);
    const awayInput = predictionForm.querySelector(`[name="away-${match.id}"]`);

    if (!homeInput || !awayInput || homeInput.disabled || awayInput.disabled) {
      continue;
    }

    const homeValue = Number(homeInput.value);
    const awayValue = Number(awayInput.value);

    if (!Number.isFinite(homeValue) || !Number.isFinite(awayValue) || homeValue < 0 || awayValue < 0) {
      predictionSaveFeedback.textContent = 'Todos los marcadores deben ser números iguales o mayores a 0.';
      return;
    }

    payload.push({
      matchId: match.id,
      predictedHomeScore: homeValue,
      predictedAwayScore: awayValue
    });
  }

  if (!payload.length) {
    predictionSaveFeedback.textContent = 'No hay predicciones editables para guardar en esta fase.';
    return;
  }

  const result = savePredictions(loadedContext.folio, loadedContext.phaseId, payload);
  predictionSaveFeedback.textContent = `Predicciones guardadas: ${result.savedCount}. Bloqueadas: ${result.blockedMatches.length}.`;

  trackEvent('quiniela_prediction_save', {
    folio: loadedContext.folio,
    phaseId: loadedContext.phaseId,
    savedCount: result.savedCount,
    blockedMatches: result.blockedMatches.length
  });

  renderRanking();
  renderMatchInputs(loadedContext.folio, loadedContext.phaseId, matches);
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
    if (errorEl) {
      errorEl.textContent = message;
    }
  });
}

function validateRegisterPayload(payload) {
  const errors = {};

  if (payload.name.trim().length < 4) {
    errors.name = 'Ingresa tu nombre completo.';
  }

  if (!/^\+?[0-9\s()-]{8,}$/.test(payload.whatsapp.trim())) {
    errors.whatsapp = 'Ingresa un WhatsApp válido.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = 'Ingresa un email válido.';
  }

  if (!['digital', 'fisico', 'ambos'].includes(payload.participationType)) {
    errors.participationType = 'Selecciona un método de participación.';
  }

  if (!payload.acceptsTerms) {
    errors.acceptsTerms = 'Debes aceptar términos y condiciones para continuar.';
  }

  return errors;
}

function normalizeStatusLabel(status) {
  if (status === 'abierta') return 'Abierta';
  if (status === 'cerrada') return 'Cerrada';
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
