// Keep dialogs inside the visible viewport when the software keyboard opens.
// Do not interfere with pinch zoom or store any user information.
export function observeMobileViewport() {
 const viewport = window.visualViewport;
 if (!viewport) return () => {};
 const root = document.documentElement;
 const update = () => {
  if (viewport.scale !== 1) return;
  root.style.setProperty('--lab-visible-height', `${viewport.height}px`);
  root.style.setProperty('--lab-visible-center', `${viewport.offsetTop + viewport.height / 2}px`);
 };
 viewport.addEventListener('resize', update);
 viewport.addEventListener('scroll', update);
 update();
 return () => {
  viewport.removeEventListener('resize', update);
  viewport.removeEventListener('scroll', update);
  root.style.removeProperty('--lab-visible-height');
  root.style.removeProperty('--lab-visible-center');
 };
}
