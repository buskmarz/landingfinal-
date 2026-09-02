(function () {
  const login = document.querySelector('[data-login]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const workspace = document.querySelector('[data-workspace]');
  const loading = document.querySelector('[data-loading]');
  const reportRoot = document.querySelector('[data-report]');
  const errorRoot = document.querySelector('[data-error]');
  const range = document.querySelector('[data-range]');
  const branch = document.querySelector('[data-branch]');
  const refresh = document.querySelector('[data-refresh]');
  const logout = document.querySelector('[data-logout]');
  const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

  function formatScore(value) { return value == null ? '—' : Number(value).toFixed(1); }
  function formatDate(value) {
    if (!value) return 'Sin respuestas';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function sampleReport() {
    const dimensions = [
      ['service_overall', 'Servicio general', 4.2], ['welcome', 'Bienvenida y atención', 4.5], ['speed', 'Agilidad', 3.6], ['accuracy', 'Pedido como se esperaba', 4.4], ['return_intent', 'Intención de regresar', 4.3]
    ].map(function (item) { return { key: item[0], label: item[1], average: item[2], distribution: { 1: 0, 2: 1, 3: 2, 4: 6, 5: 9 } }; });
    return {
      generated_at: new Date().toISOString(), source: { freshness: new Date().toISOString() },
      summary: { responses: 18, csat_percent: 83.3, service_average: 4.2, return_average: 4.3, critical_responses: 2 }, dimensions,
      recommendations: [{ level: 'watch', title: 'Prioridad: Agilidad', detail: '3.6/5. Revisa la cola, el reparto de tareas y el tiempo entre orden y entrega.' }],
      branches: [
        { label: 'UPAEP / La Paz', responses: 10, service_average: 4.3, welcome_average: 4.6, speed_average: 3.7, accuracy_average: 4.5, return_average: 4.4 },
        { label: 'Cholula', responses: 8, service_average: 4.1, welcome_average: 4.4, speed_average: 3.5, accuracy_average: 4.3, return_average: 4.2 }
      ],
      trend: [{ date: '2026-08-13', service_average: 4.0, responses: 3 }, { date: '2026-08-15', service_average: 4.3, responses: 6 }, { date: '2026-08-17', service_average: 4.1, responses: 4 }, { date: '2026-08-19', service_average: 4.4, responses: 5 }],
      comments: [{ branch_label: 'UPAEP / La Paz', received_at_local: '19 ago 2026, 11:20', service_overall: 4, comment: 'El café estuvo muy bien; el pedido tardó un poco.' }]
    };
  }

  function setMetric(name, value) { document.querySelector('[data-metric="' + name + '"]').textContent = value; }

  function renderTrend(points) {
    const root = document.querySelector('[data-trend]');
    if (!points || points.length < 2) { root.innerHTML = '<p class="trend-empty">Se necesitan respuestas en al menos dos días para mostrar la tendencia.</p>'; return; }
    const width = 540, height = 190, pad = 18;
    const coords = points.map(function (point, index) {
      return { x: pad + index * ((width - pad * 2) / (points.length - 1)), y: pad + (5 - point.service_average) * ((height - pad * 2) / 4), point: point };
    });
    const path = coords.map(function (item, index) { return (index ? 'L' : 'M') + item.x.toFixed(1) + ' ' + item.y.toFixed(1); }).join(' ');
    root.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Promedio diario de servicio"><line class="axis" x1="' + pad + '" x2="' + (width - pad) + '" y1="' + (height - pad) + '" y2="' + (height - pad) + '"></line><path class="line" d="' + path + '"></path>' + coords.map(function (item) { return '<circle class="dot" cx="' + item.x + '" cy="' + item.y + '" r="6"><title>' + item.point.date + ': ' + item.point.service_average.toFixed(1) + '/5 · ' + item.point.responses + ' respuestas</title></circle>'; }).join('') + '</svg>';
  }

  function render(report) {
    setMetric('responses', report.summary.responses);
    setMetric('csat', report.summary.csat_percent == null ? '—' : report.summary.csat_percent.toFixed(0) + '%');
    setMetric('service', formatScore(report.summary.service_average));
    setMetric('return', formatScore(report.summary.return_average));
    setMetric('critical', report.summary.critical_responses);
    document.querySelector('[data-freshness]').textContent = 'Última respuesta: ' + formatDate(report.source.freshness);
    document.querySelector('[data-sample-state]').textContent = report.summary.responses < 5 ? 'MUESTRA INICIAL' : report.summary.responses < 20 ? 'LECTURA TEMPRANA' : 'BASE OPERATIVA';

    document.querySelector('[data-recommendations]').innerHTML = report.recommendations.map(function (item) {
      return '<article class="recommendation" data-level="' + item.level + '"><strong>' + item.title + '</strong><p>' + item.detail + '</p></article>';
    }).join('');
    document.querySelector('[data-dimensions]').innerHTML = report.dimensions.map(function (item) {
      return '<div class="dimension"><strong>' + item.label + '</strong><div class="bar" aria-hidden="true"><span style="width:' + ((item.average || 0) / 5 * 100) + '%"></span></div><output>' + formatScore(item.average) + '</output></div>';
    }).join('');
    document.querySelector('[data-branches]').innerHTML = report.branches.map(function (item) {
      return '<tr><td><strong>' + item.label + '</strong></td><td>' + item.responses + '</td><td>' + formatScore(item.service_average) + '</td><td>' + formatScore(item.welcome_average) + '</td><td>' + formatScore(item.speed_average) + '</td><td>' + formatScore(item.accuracy_average) + '</td><td>' + formatScore(item.return_average) + '</td></tr>';
    }).join('');
    document.querySelector('[data-comments]').innerHTML = report.comments.length ? report.comments.map(function (item) {
      return '<article class="comment"><blockquote>“' + item.comment.replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }) + '”</blockquote><footer><span>' + item.branch_label + ' · Servicio ' + item.service_overall + '/5</span><time>' + (item.received_at_local || '') + '</time></footer></article>';
    }).join('') : '<p class="empty">Todavía no hay comentarios en este periodo.</p>';
    renderTrend(report.trend);
  }

  async function loadReport() {
    loading.hidden = false; reportRoot.hidden = true; errorRoot.hidden = true;
    try {
      const report = isLocal ? sampleReport() : await fetch('/api/customer-feedback-report?range=' + encodeURIComponent(range.value) + '&branch=' + encodeURIComponent(branch.value), { credentials: 'same-origin' }).then(async function (response) {
        const body = await response.json().catch(function () { return {}; });
        if (response.status === 401) { showLogin(); throw new Error('Tu sesión terminó.'); }
        if (!response.ok) throw new Error(body.error || 'No pudimos cargar las métricas.');
        return body;
      });
      render(report); loading.hidden = true; reportRoot.hidden = false;
    } catch (error) {
      loading.hidden = true; errorRoot.hidden = false; errorRoot.textContent = error.message;
    }
  }

  function showLogin() { workspace.hidden = true; login.hidden = false; }
  function showWorkspace() { login.hidden = true; workspace.hidden = false; loadReport(); }

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault(); loginStatus.textContent = 'Comprobando…';
    try {
      const response = await fetch('/api/customer-feedback-auth', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: loginForm.elements.password.value }) });
      const body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.error || 'No pudimos iniciar la sesión.');
      loginForm.reset(); loginStatus.textContent = ''; showWorkspace();
    } catch (error) { loginStatus.textContent = error.message; }
  });
  [range, branch].forEach(function (control) { control.addEventListener('change', loadReport); });
  refresh.addEventListener('click', loadReport);
  logout.addEventListener('click', async function () { if (!isLocal) await fetch('/api/customer-feedback-auth', { method: 'DELETE', credentials: 'same-origin' }); showLogin(); });

  if (isLocal) { showWorkspace(); document.querySelector('[data-freshness]').textContent = 'Vista previa con datos ilustrativos'; }
  else fetch('/api/customer-feedback-auth', { credentials: 'same-origin' }).then(function (response) { return response.json(); }).then(function (body) { body.authenticated ? showWorkspace() : showLogin(); }).catch(showLogin);
})();
