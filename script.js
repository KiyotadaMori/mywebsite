const body = document.body;
const toggle = document.getElementById("language-toggle");
const savedLanguage = localStorage.getItem("site-language");

function setLanguage(lang) {
  const next = lang === "ja" ? "ja" : "en";
  body.dataset.lang = next;
  document.documentElement.lang = next;
  toggle.textContent = next === "en" ? "JP" : "EN";
  toggle.setAttribute("aria-label", next === "en" ? "Switch to Japanese" : "英語に切り替える");
  localStorage.setItem("site-language", next);
}

setLanguage(savedLanguage || "en");

toggle.addEventListener("click", () => {
  setLanguage(body.dataset.lang === "en" ? "ja" : "en");
});

document.getElementById("year").textContent = new Date().getFullYear();

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px"
  });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const hero = document.querySelector(".hero");
const transitionLabel = document.querySelector(".section-transition span");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (hero && !prefersReducedMotion && window.matchMedia("(pointer:fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
    hero.style.setProperty("--parallax-x", x.toFixed(2) + "px");
    hero.style.setProperty("--parallax-y", y.toFixed(2) + "px");
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--parallax-x", "0px");
    hero.style.setProperty("--parallax-y", "0px");
  });
}

if (transitionLabel && !prefersReducedMotion) {
  let ticking = false;

  const updateTransition = () => {
    const rect = transitionLabel.parentElement.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewport / 2) / viewport));
    transitionLabel.style.setProperty("--transition-x", (progress * -32).toFixed(1) + "px");
    transitionLabel.style.setProperty("--transition-y", (progress * 7).toFixed(1) + "px");
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateTransition);
      ticking = true;
    }
  }, { passive:true });

  updateTransition();
}
