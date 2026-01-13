// Filter functionality for category pages
function setupFilters() {
  const enhancedFilter = document.getElementById("filter-enhanced");
  const platformsFilter = document.getElementById("filter-platforms");
  const termsGrid = document.getElementById("terms-grid");

  if (!enhancedFilter || !platformsFilter || !termsGrid) return;

  const allTermCards = Array.from(termsGrid.querySelectorAll(".term-card"));

  function applyFilters() {
    const showOnlyEnhanced = enhancedFilter.checked;
    const showOnlyPlatforms = platformsFilter.checked;

    allTermCards.forEach((card) => {
      let show = true;

      if (showOnlyEnhanced) {
        const hasEnhanced = card.querySelector(".badge-enhanced") !== null;
        show = show && hasEnhanced;
      }

      if (showOnlyPlatforms) {
        const hasPlatforms = card.querySelector(".platform-count") !== null;
        show = show && hasPlatforms;
      }

      card.style.display = show ? "flex" : "none";
    });

    // Update visible count
    const visibleCount = allTermCards.filter(
      (card) => card.style.display !== "none",
    ).length;
    updateVisibleCount(visibleCount, allTermCards.length);
  }

  function updateVisibleCount(visible, total) {
    const countElement = document.querySelector(".term-count");
    if (countElement) {
      countElement.textContent =
        visible === total ? `${total} terms` : `${visible} of ${total} terms`;
    }
  }

  enhancedFilter.addEventListener("change", applyFilters);
  platformsFilter.addEventListener("change", applyFilters);
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupFilters);
} else {
  setupFilters();
}
