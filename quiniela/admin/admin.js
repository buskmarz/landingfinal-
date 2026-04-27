import {
  getMatches,
  getParticipants,
  getPredictions,
  lockMatch,
  updateParticipantStatus,
  updateMatchResult
} from '../services/quinielaService.js';
import { trackEvent } from '../services/analytics.js';

const participantsBody = document.querySelector('#participants-body');
const predictionsBody = document.querySelector('#predictions-body');
const resultsMatches = document.querySelector('#results-matches');
const resultsForm = document.querySelector('#results-form');
const resultsFeedback = document.querySelector('#results-feedback');
const exportParticipantsButton = document.querySelector('#export-participants');

renderAll();
resultsForm.addEventListener('submit', onSaveResults);
exportParticipantsButton.addEventListener('click', exportParticipantsCsv);
participantsBody.addEventListener('click', onParticipantAction);
resultsMatches.addEventListener('click', onMatchAction);

function renderAll() {
  renderParticipants();
  renderPredictions();
  renderResultsMatches();
}

function renderParticipants() {
  const participants = getParticipants();
  if (!participants.length) {
    participantsBody.innerHTML = '<tr><td colspan="8">Sin participantes aún.</td></tr>';
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
        <td>${participant.status || 'creado'}</td>
        <td>${new Date(participant.createdAt).toLocaleString('es-MX')}</td>
        <td>
          <button class="q-btn q-btn-secondary admin-mini-btn" data-status-toggle="${participant.folio}" type="button">
            ${(participant.status || 'creado') === 'cancelado' ? 'Activar' : 'Cancelar'}
          </button>
        </td>
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
      const label = match ? `${match.homeFlag || ''} ${match.homeTeam} vs ${match.awayFlag || ''} ${match.awayTeam}` : prediction.matchId;

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
            <strong>${match.homeFlag || ''} ${match.homeTeam} vs ${match.awayFlag || ''} ${match.awayTeam}</strong>
            <div><small>Grupo ${match.group} · ${match.phase} · ${match.venue}, ${match.hostCity} · ${new Date(match.matchDate).toLocaleString('es-MX')}</small></div>
          </div>
          <span class="q-phase-status" data-status="${match.status === 'finalizado' ? 'cerrada' : 'proximamente'}">${match.status}</span>
        </div>

        <div class="q-score-grid">
          <label>
            ${match.homeFlag || ''} ${match.homeTeam}
            <input name="home-${match.id}" type="number" min="0" max="20" value="${match.homeScore ?? ''}" />
          </label>
          <strong>-</strong>
          <label>
            ${match.awayFlag || ''} ${match.awayTeam}
            <input name="away-${match.id}" type="number" min="0" max="20" value="${match.awayScore ?? ''}" />
          </label>
        </div>
        <button class="q-btn q-btn-secondary admin-mini-btn" type="button" data-lock-match="${match.id}">Bloquear partido</button>
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

function onParticipantAction(event) {
  const folio = event.target.dataset.statusToggle;
  if (!folio) return;

  const participant = getParticipants().find((entry) => entry.folio === folio);
  const nextStatus = (participant?.status || 'creado') === 'cancelado' ? 'activado' : 'cancelado';
  updateParticipantStatus(folio, nextStatus);
  renderParticipants();
}

function onMatchAction(event) {
  const matchId = event.target.dataset.lockMatch;
  if (!matchId) return;

  lockMatch(matchId);
  renderResultsMatches();
}

function exportParticipantsCsv() {
  const rows = [
    ['folio', 'name', 'whatsapp', 'email', 'participationType', 'status', 'createdAt'],
    ...getParticipants().map((participant) => [
      participant.folio,
      participant.name,
      participant.whatsapp,
      participant.email,
      participant.participationType,
      participant.status || 'creado',
      participant.createdAt
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'quiniela-better-mood-participantes.csv';
  link.click();
  URL.revokeObjectURL(url);
}
