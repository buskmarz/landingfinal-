import { MOCK_MATCHES } from '../data/mockData.js';
import { trackEvent } from '../services/analytics.js';

const participantsBody = document.querySelector('#participants-body');
const predictionsBody = document.querySelector('#predictions-body');
const resultsMatches = document.querySelector('#results-matches');
const resultsForm = document.querySelector('#results-form');
const resultsFeedback = document.querySelector('#results-feedback');
const exportParticipantsButton = document.querySelector('#export-participants');
const adminSecretInput = document.querySelector('#admin-secret');
const saveSecretButton = document.querySelector('#save-admin-secret');

let participants = [];
let predictions = [];
let adminSecret = sessionStorage.getItem('bm26.adminSecret') || '';

if (adminSecretInput) adminSecretInput.value = adminSecret;
saveSecretButton?.addEventListener('click', () => {
  adminSecret = adminSecretInput.value.trim();
  sessionStorage.setItem('bm26.adminSecret', adminSecret);
  renderAll();
});
resultsForm.addEventListener('submit', onSaveResults);
exportParticipantsButton.addEventListener('click', exportParticipantsCsv);
participantsBody.addEventListener('click', onParticipantAction);

renderAll();

async function renderAll() {
  await Promise.all([loadParticipants(), loadPredictions()]);
  renderParticipants();
  renderPredictions();
  renderResultsMatches();
}

async function loadParticipants() {
  try {
    const payload = await adminFetch('/.netlify/functions/admin-list-participants');
    participants = payload.participants || [];
  } catch (error) {
    participantsBody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
  }
}

async function loadPredictions() {
  try {
    const payload = await adminFetch('/.netlify/functions/admin-list-predictions');
    predictions = payload.predictions || [];
  } catch (error) {
    predictions = [];
  }
}

function renderParticipants() {
  if (!participants.length) {
    participantsBody.innerHTML = '<tr><td colspan="8">Sin participantes aún.</td></tr>';
    return;
  }

  participantsBody.innerHTML = participants.map((participant) => `
    <tr>
      <td>${participant.folioCode || participant.folio || '-'}</td>
      <td>${participant.name}</td>
      <td>${participant.phone || participant.whatsapp}</td>
      <td>${participant.email}</td>
      <td>${participant.participationType}</td>
      <td>${participant.status || 'pending_payment'}</td>
      <td>${new Date(participant.createdAt).toLocaleString('es-MX')}</td>
      <td>
        <button class="q-btn q-btn-secondary admin-mini-btn" data-activate="${participant.folioCode || participant.folio}" type="button">Activar</button>
        <button class="q-btn q-btn-secondary admin-mini-btn" data-cancel="${participant.folioCode || participant.folio}" type="button">Cancelar</button>
      </td>
    </tr>
  `).join('');
}

function renderPredictions() {
  const matchById = Object.fromEntries(MOCK_MATCHES.map((match) => [match.id, match]));
  if (!predictions.length) {
    predictionsBody.innerHTML = '<tr><td colspan="5">Sin predicciones aún.</td></tr>';
    return;
  }

  predictionsBody.innerHTML = predictions.map((prediction) => {
    const match = matchById[prediction.matchId];
    const label = match ? `${match.homeFlag || ''} ${match.homeTeam} vs ${match.awayFlag || ''} ${match.awayTeam}` : prediction.matchId;
    return `
      <tr>
        <td>${prediction.folio || prediction.participantFolio}</td>
        <td>${label}</td>
        <td>${prediction.homeScorePrediction} - ${prediction.awayScorePrediction}</td>
        <td>${new Date(prediction.updatedAt).toLocaleString('es-MX')}</td>
        <td>${prediction.lockedAt ? 'Sí' : 'No'}</td>
      </tr>
    `;
  }).join('');
}

function renderResultsMatches() {
  resultsMatches.innerHTML = MOCK_MATCHES.map((match) => `
    <article class="q-match-card">
      <div class="q-match-head">
        <div>
          <strong>${match.homeFlag || ''} ${match.homeTeam} vs ${match.awayFlag || ''} ${match.awayTeam}</strong>
          <div><small>Grupo ${match.group} · ${match.phase} · ${match.venue}, ${match.hostCity} · ${new Date(match.matchDate).toLocaleString('es-MX')}</small></div>
        </div>
        <span class="q-phase-status" data-status="${match.status === 'finalizado' ? 'cerrada' : 'proximamente'}">${match.status}</span>
      </div>
      <div class="q-score-grid">
        <label>${match.homeFlag || ''} ${match.homeTeam}<input name="home-${match.id}" type="number" min="0" max="20" value="${match.homeScoreResult ?? ''}" /></label>
        <strong>-</strong>
        <label>${match.awayFlag || ''} ${match.awayTeam}<input name="away-${match.id}" type="number" min="0" max="20" value="${match.awayScoreResult ?? ''}" /></label>
      </div>
    </article>
  `).join('');
}

async function onSaveResults(event) {
  event.preventDefault();
  let updated = 0;

  for (const match of MOCK_MATCHES) {
    const homeRaw = resultsForm.querySelector(`[name="home-${match.id}"]`)?.value;
    const awayRaw = resultsForm.querySelector(`[name="away-${match.id}"]`)?.value;
    if (homeRaw === '' || awayRaw === '') continue;
    await adminFetch('/.netlify/functions/admin-update-result', {
      method: 'POST',
      body: { matchId: match.id, homeScoreResult: Number(homeRaw), awayScoreResult: Number(awayRaw) }
    });
    updated += 1;
  }
  await adminFetch('/.netlify/functions/admin-recalculate-ranking', { method: 'POST', body: {} });
  resultsFeedback.textContent = `Resultados actualizados: ${updated}. Ranking recalculado.`;
  trackEvent('quiniela_admin_results_update', { updated });
}

async function onParticipantAction(event) {
  const activate = event.target.dataset.activate;
  const cancel = event.target.dataset.cancel;
  if (!activate && !cancel) return;
  const endpoint = activate ? 'admin-activate-folio' : 'admin-cancel-folio';
  await adminFetch(`/.netlify/functions/${endpoint}`, {
    method: 'POST',
    body: { folioCode: activate || cancel }
  });
  renderAll();
}

async function exportParticipantsCsv() {
  const csv = await adminFetchText('/.netlify/functions/admin-export-csv');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'quiniela-better-mood-participantes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function adminFetch(url, options = {}) {
  if (!adminSecret) throw new Error('Ingresa ADMIN_SECRET para consultar el panel.');
  const fetchOptions = {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret, ...(options.headers || {}) }
  };
  if (options.body && typeof options.body !== 'string') fetchOptions.body = JSON.stringify(options.body);
  const response = await fetch(url, fetchOptions);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Error admin.');
  return payload;
}

async function adminFetchText(url, options = {}) {
  if (!adminSecret) throw new Error('Ingresa ADMIN_SECRET para consultar el panel.');
  const response = await fetch(url, {
    ...options,
    headers: { 'x-admin-secret': adminSecret, ...(options.headers || {}) }
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(payload || 'Error admin.');
  return payload;
}
