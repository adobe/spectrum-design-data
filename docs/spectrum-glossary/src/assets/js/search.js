// Search functionality using Fuse.js
import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.mjs";

let fuse = null;
let searchData = [];

// Get base path from window or default to empty string
const getBasePath = () => window.BASE_PATH || "";

// Initialize search
async function initSearch() {
  try {
    // Load search index
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/api/v1/search-index.json`);
    searchData = await response.json();

    // Initialize Fuse.js
    fuse = new Fuse(searchData, {
      keys: [
        { name: "id", weight: 2 },
        { name: "label", weight: 2 },
        { name: "description", weight: 1.5 },
        { name: "definition.description", weight: 1.5 },
        { name: "definition.superordinate", weight: 1.3 },
        { name: "aliases", weight: 1 },
        { name: "registryLabel", weight: 0.8 },
        { name: "platformTerms", weight: 1 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  } catch (error) {
    console.error("Failed to initialize search:", error);
  }
}

// Display search results
function displayResults(results, query) {
  const resultsContainer = document.getElementById("search-results");
  const resultsList = document.getElementById("results-list");
  const resultsCount = document.getElementById("results-count");

  if (!resultsContainer || !resultsList || !resultsCount) return;

  if (!query || query.length < 2) {
    resultsContainer.style.display = "none";
    return;
  }

  resultsContainer.style.display = "block";
  resultsCount.textContent = `${results.length} result${results.length !== 1 ? "s" : ""}`;

  if (results.length === 0) {
    resultsList.innerHTML = '<p class="no-results">No results found</p>';
    return;
  }

  resultsList.innerHTML = results
    .slice(0, 20)
    .map(
      ({ item, score }) => `
    <a href="${getBasePath()}/terms/${item.id}/" class="search-result-item">
      <div class="result-header">
        <strong>${highlightMatch(item.label || item.id, query)}</strong>
        <span class="result-registry">${item.registryLabel || item.registryType}</span>
      </div>
      ${item.description ? `<p class="result-description">${highlightMatch(truncate(item.description, 100), query)}</p>` : ""}
      ${item.definition?.description ? `<p class="result-description">${highlightMatch(truncate(item.definition.description, 100), query)}</p>` : ""}
    </a>
  `,
    )
    .join("");
}

// Highlight matching text
function highlightMatch(text, query) {
  if (!text || !query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// Escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Truncate text
function truncate(text, length) {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Set up event listeners
function setupSearch() {
  const searchInput = document.getElementById("glossary-search");
  const clearButton = document.getElementById("clear-search");

  if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();

      searchTimeout = setTimeout(() => {
        if (fuse && query.length >= 2) {
          const results = fuse.search(query);
          displayResults(results, query);
        } else if (query.length < 2) {
          displayResults([], query);
        }
      }, 300); // Debounce search
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInput.focus();
      }

      // Escape to clear search
      if (e.key === "Escape") {
        searchInput.value = "";
        displayResults([], "");
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        displayResults([], "");
        searchInput.focus();
      }
    });
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    setupSearch();
  });
} else {
  initSearch();
  setupSearch();
}

// Add search result styles
const style = document.createElement("style");
style.textContent = `
  .search-result-item {
    display: block;
    padding: var(--spectrum-spacing-300);
    border-bottom: 1px solid var(--spectrum-gray-200);
    text-decoration: none;
    transition: background-color 0.2s;
  }
  
  .search-result-item:hover {
    background-color: var(--spectrum-gray-100);
  }
  
  .search-result-item:last-child {
    border-bottom: none;
  }
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spectrum-spacing-200);
  }
  
  .result-header strong {
    color: var(--spectrum-gray-900);
    font-size: var(--spectrum-font-size-200);
  }
  
  .result-registry {
    font-size: var(--spectrum-font-size-75);
    color: var(--spectrum-gray-500);
    background-color: var(--spectrum-gray-100);
    padding: 2px 8px;
    border-radius: var(--spectrum-corner-radius-75);
  }
  
  .result-description {
    color: var(--spectrum-gray-600);
    font-size: var(--spectrum-font-size-100);
    margin: 0;
  }
  
  .no-results {
    color: var(--spectrum-gray-500);
    text-align: center;
    padding: var(--spectrum-spacing-500);
  }
  
  mark {
    background-color: var(--spectrum-accent-color);
    color: white;
    padding: 1px 3px;
    border-radius: 2px;
  }
`;
document.head.appendChild(style);
