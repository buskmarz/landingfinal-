const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function fromSite(input, topics, items) {
  const q = normalize(input);
  const exact = topics.find(t => [t.topic, t.question, ...(t.aliases || [])].some(s => normalize(s) === q));
  if (exact) return exact;
  if (/^(?:que horario tienen|cual es (?:su|el) horario|donde (?:estan|se ubican)|cual es (?:su|la) direccion|a que hora (?:abren|cierran)|como (?:llego|llegar))$/.test(q)) return topics[0];
  const ingredient = q.match(/^(?:que (?:bebidas|cafes) (?:llevan|tienen|contienen)|(?:bebidas|cafes) con) (cbd|melena de leon|rhodiola|ashwagandha|cordyceps|reishi)$/)?.[1];
  if (ingredient) {
    const matches = items.filter(item => item.category === 'recetas' && normalize(item.description).includes(ingredient));
    if (matches.length) return {
      text: matches.map(item => item.name + ' · $' + item.price + ' MXN').join('\n'),
      href:'/menu/#recetas', link:'Ver bebidas de la casa'
    };
  }
  const productQuery = q.replace(/^(?:cuanto (?:cuesta|vale)|que (?:lleva|contiene)|precio (?:de|del)|ingredientes (?:de|del)) (?:el |la |un |una )?/, '');
  const item = items.find(i => normalize(i.name) === productQuery || normalize(i.name).replace(/^(?:el|la) /, '') === productQuery);
  if (item) return {
    text: item.name + (item.size ? ' (' + item.size + ')' : '') + ' · $' + item.price + ' MXN. ' + item.description,
    link: 'Ver en el menú', href: '/menu/?producto=' + encodeURIComponent(item.id)
  };
}
