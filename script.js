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