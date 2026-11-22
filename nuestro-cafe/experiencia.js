async function showCheckoutAvailability() {
  try {
    const response = await fetch('/api/coffee-product?product=natural');
    if (!response.ok || (await response.json()).checkoutAvailable !== true) return;
    document.querySelectorAll('[data-natural-checkout-link]').forEach(link => {
      link.textContent = 'Comprar café';
      link.removeAttribute('aria-label');
    });
  } catch {
    // Keep the pre-launch label if availability cannot be confirmed.
  }
}

showCheckoutAvailability();
