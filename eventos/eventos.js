(function () {
  const setup = document.querySelector('[data-event-setup]');
  const whatsapp = document.querySelector('[data-event-whatsapp]');
  const email = document.querySelector('[data-event-email]');
  if (!setup || !whatsapp || !email) return;

  const whatsappUrl = new URL(whatsapp.href);
  const emailUrl = new URL(email.href);
  const subject = emailUrl.searchParams.get('subject');
  const greeting = whatsappUrl.searchParams.get('text');
  const formats = {
    espresso: 'una barra de espresso',
    precoladora: 'una mesa de café filtrado'
  };

  function updateLinks() {
    const format = formats[setup.value];
    const message = format ? `Hola, me gustaría cotizar ${format} para un evento en Puebla.` : greeting;
    whatsappUrl.searchParams.set('text', message);
    whatsapp.href = whatsappUrl.href;
    email.href = `${emailUrl.protocol}${emailUrl.pathname}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }

  setup.addEventListener('change', updateLinks);
  updateLinks();
})();
