// Theme switcher
const themeToggle = document.getElementById("theme-toggle");
const themeContainer = document.getElementById("theme-container");
const html = document.documentElement;

// Get saved theme or default to light
let currentTheme = localStorage.getItem("theme") || "light";

// Apply theme on load
function applyTheme(theme) {
  html.classList.remove("spectrum--light", "spectrum--dark");
  html.classList.add(`spectrum--${theme}`);
  themeContainer.setAttribute("color", theme);
  localStorage.setItem("theme", theme);
  currentTheme = theme;
}

// Initialize theme
applyTheme(currentTheme);

// Toggle theme on button click
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(newTheme);
  });
}
