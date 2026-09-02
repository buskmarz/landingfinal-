(function () {
  const questions = [
    {
      id: 'service_overall',
      kicker: 'Experiencia general',
      text: 'En general, ¿cómo fue nuestro servicio?',
      hint: 'Piensa en toda tu visita.'
    },
    {
      id: 'welcome',
      kicker: 'Calidez',
      text: '¿Qué tan bienvenido(a) y atendido(a) te sentiste?',
      hint: 'El trato y la disposición del equipo.'
    },
    {
      id: 'speed',
      kicker: 'Agilidad',
      text: '¿Qué tan ágil fue ordenar y recibir tu pedido?',
      hint: 'Desde que llegaste hasta que recibiste.'
    },
    {
      id: 'accuracy',
      kicker: 'Exactitud',
      text: '¿Recibiste tu pedido tal como lo esperabas?',
      hint: 'Considera producto, preparación e indicaciones especiales.',
      labels: ['Nada', 'Poco', 'Más o menos', 'Casi por completo', 'Por completo']
    },
    {
      id: 'return_intent',
      kicker: 'Próxima visita',
      text: 'Después de esta experiencia, ¿qué tan probable es que regreses?',
      hint: 'No es una promoción; queremos conocer tu intención real.',
      labels: ['Nada probable', 'Poco probable', 'No lo sé', 'Probable', 'Muy probable']
    }
  ];

  const defaultLabels = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];
  const mouthPaths = {
    1: 'M20 43 Q32 29 44 43',
    2: 'M21 41 Q32 32 43 41',
    3: 'M21 39 L43 39',
    4: 'M21 35 Q32 44 43 35',
    5: 'M20 34 Q32 48 44 34'
  };

  const intro = document.querySelector('[data-survey-intro]');
  const setup = document.querySelector('[data-survey-setup]');
  const setupError = document.querySelector('[data-setup-error]');
  const flow = document.querySelector('[data-survey-flow]');
  const form = document.querySelector('[data-survey-form]');
  const stage = document.querySelector('[data-question-stage]');
  const progressLabel = document.querySelector('[data-progress-label]');
  const progressBar = document.querySelector('[data-progress-bar]');
  const questionError = document.querySelector('[data-question-error]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const commentSection = document.querySelector('[data-survey-comment]');
  const commentForm = document.querySelector('[data-comment-form]');
  const commentInput = document.querySelector('#survey-comment');
  const characterCount = document.querySelector('[data-character-count]');
  const commentBack = document.querySelector('[data-comment-back]');
  const submitButton = document.querySelector('[data-submit]');
  const submitStatus = document.querySelector('[data-submit-status]');
  const thanks = document.querySelector('[data-survey-thanks]');
  const previewNote = document.querySelector('[data-preview-note]');
  const optionTemplate = document.querySelector('#face-option-template');

  let current = 0;
  let startedAt = 0;
  let submissionId = '';
  const answers = {};
  const context = { branch: '', visit_when: '' };

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'bm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function renderQuestion() {
    const question = questions[current];
    stage.innerHTML = '';
    const card = document.createElement('article');
    card.className = 'question-card';
    card.innerHTML = '<p class="question-card__kicker"></p><h2 tabindex="-1"></h2><p class="question-card__hint"></p><div class="face-scale" role="radiogroup"></div>';
    card.querySelector('.question-card__kicker').textContent = question.kicker;
    card.querySelector('h2').textContent = question.text;
    card.querySelector('.question-card__hint').textContent = question.hint;

    const scale = card.querySelector('.face-scale');
    scale.setAttribute('aria-label', question.text);
    const labels = question.labels || defaultLabels;
    labels.forEach(function (labelText, index) {
      const value = index + 1;
      const option = optionTemplate.content.firstElementChild.cloneNode(true);
      const input = option.querySelector('input');
      input.type = 'radio';
      input.name = question.id;
      input.value = String(value);
      input.setAttribute('aria-label', labelText);
      input.checked = Number(answers[question.id]) === value;
      option.dataset.value = String(value);
      option.querySelector('.face-mouth').setAttribute('d', mouthPaths[value]);
      option.querySelector('.face-option__label').textContent = labelText;
      input.addEventListener('change', function () {
        answers[question.id] = value;
        questionError.hidden = true;
      });
      scale.appendChild(option);
    });

    stage.appendChild(card);
    progressLabel.textContent = 'Pregunta ' + (current + 1) + ' de ' + questions.length;
    progressBar.style.width = (((current + 1) / questions.length) * 100) + '%';
    prevButton.hidden = current === 0;
    nextButton.textContent = current === questions.length - 1 ? 'Continuar' : 'Siguiente';
    questionError.hidden = true;
    window.requestAnimationFrame(function () { card.querySelector('h2').focus({ preventScroll: true }); });
  }

  setup.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(setup);
    const branch = String(data.get('branch') || '');
    const visitWhen = String(data.get('visit_when') || '');
    if (!branch || !visitWhen) {
      setupError.hidden = false;
      return;
    }
    context.branch = branch;
    context.visit_when = visitWhen;
    startedAt = Date.now();
    submissionId = makeId();
    setupError.hidden = true;
    intro.hidden = true;
    flow.hidden = false;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  nextButton.addEventListener('click', function () {
    const question = questions[current];
    if (!answers[question.id]) {
      questionError.hidden = false;
      stage.querySelector('input')?.focus();
      return;
    }
    if (current < questions.length - 1) {
      current += 1;
      renderQuestion();
      return;
    }
    flow.hidden = true;
    commentSection.hidden = false;
    commentInput.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  prevButton.addEventListener('click', function () {
    if (current === 0) return;
    current -= 1;
    renderQuestion();
  });

  commentBack.addEventListener('click', function () {
    commentSection.hidden = true;
    flow.hidden = false;
    current = questions.length - 1;
    renderQuestion();
  });

  commentInput.addEventListener('input', function () {
    characterCount.textContent = String(commentInput.value.length);
  });

  commentForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando…';
    submitStatus.textContent = '';

    const payload = {
      submission_id: submissionId,
      branch: context.branch,
      visit_when: context.visit_when,
      ratings: answers,
      comment: commentInput.value.trim(),
      company: form.elements.company.value,
      elapsed_ms: Date.now() - startedAt,
      page: window.location.pathname
    };

    const isPreview = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    try {
      if (isPreview) {
        await new Promise(function (resolve) { window.setTimeout(resolve, 650); });
      } else {
        const response = await fetch('/api/customer-feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(result.error || 'No pudimos enviar tu respuesta.');
      }
      commentSection.hidden = true;
      thanks.hidden = false;
      previewNote.hidden = !isPreview;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      submitStatus.textContent = error.message || 'No pudimos enviar tu respuesta. Intenta nuevamente.';
      submitButton.disabled = false;
      submitButton.textContent = 'Reintentar';
    }
  });
})();
