import {fromSite} from './data/guia-respuestas.mjs';
const form = document.querySelector('#guide-form');
const question = document.querySelector('#guide-question');
const answer = document.querySelector('#guide-answer');
const topicsBox = document.querySelector('#guide-topics');
const preview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let topics = [];
let items = [];
let history = [];
let busy = false;

function display(text, source) {
  answer.replaceChildren(document.createTextNode(text));
  if (source) {
    const link = document.createElement('a');
    link.href = source.href;
    link.textContent = source.link;
    answer.append(document.createElement('br'), link);
  }
}

function remember(input, reply) {
  history = [...history.slice(-2), {role:'user', content:input}, {role:'assistant', content:reply.slice(0, 1600)}];
}

async function ask(input, selected) {
  if (busy || !input.trim()) return;
  question.value = input;
  const local = selected || fromSite(input, topics, items);
  if (local) {
    display(local.text, local);
    remember(input, local.text);
    return;
  }
  if (preview) {
    display('La IA está en pausa en esta vista previa. Puedes elegir un tema o preguntar por el precio y los ingredientes de una bebida de la carta.', {href:'/menu/', link:'Consultar la carta'});
    return;
  }
  busy = true;
  form.querySelectorAll('button').forEach(b => { b.disabled = true; });
  question.readOnly = true;
  display('Consultando al barista…');
  try {
    const messages = [...history, {role:'user', content:input}];
    while (messages.length > 1 && new TextEncoder().encode(JSON.stringify(messages)).length > 6200) messages.splice(0, 2);
    const response = await fetch('/.netlify/functions/coffee-chat', {
      method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(28000),
      body:JSON.stringify({surface:'landing', messages})
    });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('empty');
    display(data.reply);
    remember(input, data.reply);
  } catch {
    display('La IA no está disponible ahora. Las preguntas frecuentes y el menú siguen disponibles.', {href:'/menu/', link:'Consultar el menú'});
  } finally {
    busy = false;
    question.readOnly = false;
    form.querySelectorAll('button').forEach(b => { b.disabled = false; });
  }
}

async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('unavailable');
  return response.json();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  ask(question.value.trim());
});

async function start() {
  const [facts, catalog] = await Promise.allSettled([readJSON('/data/guia-better-mood.json'), readJSON('/menu/catalog.json')]);
  if (catalog.status === 'fulfilled') items = catalog.value.items;
  if (facts.status === 'fulfilled') topics = facts.value;
  for (const topic of topics.slice(0, 5)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = topic.topic;
    button.addEventListener('click', () => ask(topic.question, topic));
    topicsBox.append(button);
  }
  form.hidden = false;
}
start();
