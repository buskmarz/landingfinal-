import {
  getMatches,
  getParticipants,
  getPredictions,
  updateMatchResult
} from '../services/quinielaService.js';
import { trackEvent } from '../services/analytics.js';

const participantsBody = document.querySelector('#participants-body');
const predictionsBody = document.querySelector('#predictions-body');
const resultsMatches = document.querySelector('#results-matches');
const resultsForm = document.querySelector('#results-form');
const resultsFeedback = document.querySelector('#results-feedback');

renderAll();
resultsForm.addEventListener('submit', onSaveResults);

function renderAll() {
  renderParticipants();
  renderPredictions();
  renderResultsMatches();
}

function renderParticipants() {
  const participants = getParticipants();
  if (!participants.length) {
    participantsBody.innerHTML = '<tr><td colspan="6">Sin participantes aún.</td></tr>';
    return;
  }

  participantsBody.innerHTML = participants
    .map(
      (participant) => `
      <tr>
        <td>${participant.folio}</td>
        <td>${participant.name}</td>
        <td>${participant.whatsapp}</td>
        <td>${participant.email}</td>
        <td>${participant.participationType}</td>
        <td>${new Date(participant.createdAt).toLocaleString('es-MX')}</td>
      </tr>
    `
    )
    .join('');
}

function renderPredictions() {
  const predictions = getPredictions();
  const matches = getMatches();
  const matchById = Object.fromEntries(matches.map((match) => [match.id, match]));

  if (!predictions.length) {
    predictionsBody.innerHTML = '<tr><td colspan="5">Sin predicciones aún.</td></tr>';
    return;
  }

  predictionsBody.innerHTML = predictions
    .map((prediction) => {
      const match = matchById[prediction.matchId];
      const label = match ? `${match.homeTeam} vs ${match.awayTeam}` : prediction.matchId;

      return `
      <tr>
        <td>${prediction.participantFolio}</td>
        <td>${label}</td>
        <td>${prediction.predictedHomeScore} - ${prediction.predictedAwayScore}</td>
        <td>${new Date(prediction.updatedAt).toLocaleString('es-MX')}</td>
        <td>${prediction.locked ? 'Sí' : 'No'}</td>
      </tr>
      `;
    })
    .join('');
}

function renderResultsMatches() {
  const matches = getMatches();

  resultsMatches.innerHTML = matches
    .map(
      (match) => `
      <article class="q-match-card">
        <div class="q-match-head">
          <div>
            <strong>${match.homeTeam} vs ${match.awayTeam}</strong>
            <div><small>${match.phase} · ${new Date(match.matchDate).toLocaleString('es-MX')}</small></div>
          </div>
          <span class="q-phase-status" data-status="${match.status === 'finalizado' ? 'cerrada' : 'proximamente'}">${match.status}</span>
        </div>

        <div class="q-score-grid">
          <label>
            ${match.homeTeam}
            <input name="home-${match.id}" type="number" min="0" max="20" value="${match.homeScore ?? ''}" />
          </label>
          <strong>-</strong>
          <label>
            ${match.awayTeam}
            <input name="away-${match.id}" type="number" min="0" max="20" value="${match.awayScore ?? ''}" />
          </label>
        </div>
      </article>
      `
    )
    .join('');
}

function onSaveResults(event) {
  event.preventDefault();
  const matches = getMatches();
  let updated = 0;

  matches.forEach((match) => {
    const homeInput = resultsForm.querySelector(`[name="home-${match.id}"]`);
    const awayInput = resultsForm.querySelector(`[name="away-${match.id}"]`);
    const homeRaw = homeInput?.value;
    const awayRaw = awayInput?.value;

    if (homeRaw === '' || awayRaw === '') {
      return;
    }

    const homeScore = Number(homeRaw);
    const awayScore = Number(awayRaw);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
      return;
    }

    updateMatchResult(match.id, homeScore, awayScore, 'finalizado');
    updated += 1;
  });

  resultsFeedback.textContent = `Resultados actualizados: ${updated}. Ranking recalculado automáticamente en /quiniela/.`;
  trackEvent('quiniela_admin_results_update', { updated });

  renderAll();
}
