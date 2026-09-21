const body = document.body;
const toggle = document.getElementById("language-toggle");
const savedLanguage = localStorage.getItem("site-language");

function setLanguage(lang) {
  const next = lang === "ja" ? "ja" : "en";
  body.dataset.lang = next;
  document.documentElement.lang = next;
  toggle.textContent = next === "en" ? "日本語" : "English";
  toggle.setAttribute("aria-label", next === "en" ? "Switch to Japanese" : "英語に切り替える");
  localStorage.setItem("site-language", next);
}

setLanguage(savedLanguage || (navigator.language.startsWith("ja") ? "ja" : "en"));

toggle.addEventListener("click", () => {
  setLanguage(body.dataset.lang === "en" ? "ja" : "en");
});

document.getElementById("year").textContent = new Date().getFullYear();
