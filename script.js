const toggleButton = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const header = document.querySelector(".header");

const setHeaderOffset = () => {
  if (!header) return;
  document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
};

setHeaderOffset();
window.addEventListener("resize", setHeaderOffset);
window.addEventListener("load", setHeaderOffset);

if (toggleButton && nav) {
  toggleButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggleButton.setAttribute("aria-expanded", "false");
    });
  });
}

const orderDropdown = document.querySelector(".order-dropdown");
const orderSummary = orderDropdown?.querySelector("summary");

if (orderDropdown) {
  orderDropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      orderDropdown.removeAttribute("open");
    });
  });

  document.addEventListener("click", (event) => {
    if (!orderDropdown.hasAttribute("open")) return;
    if (orderDropdown.contains(event.target)) return;
    orderDropdown.removeAttribute("open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!orderDropdown.hasAttribute("open")) return;
    orderDropdown.removeAttribute("open");
    orderSummary?.focus();
  });
}

// Small header shadow on scroll for depth
window.addEventListener("scroll", () => {
  if (!header) return;
  const scrolled = window.scrollY > 8;
  header.style.boxShadow = scrolled ? "0 6px 18px rgba(35,31,32,0.06)" : "none";
});
