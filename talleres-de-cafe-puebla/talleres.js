(() => {
  const shareButton = document.querySelector('[data-share-event]');
  const status = document.querySelector('[data-share-status]');
  if (!shareButton) return;

  shareButton.addEventListener('click', async () => {
    const shareData = {
      title: 'Agenda Better Mood Coffee',
      text: 'Talleres, barras invitadas y encuentros para compartir café en Better Mood.',
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        if (status) status.textContent = 'Enlace copiado.';
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && status) status.textContent = 'No pudimos compartir. Copia el enlace del navegador.';
    }
  });
})();
