let highlightWeight = 700;
let lowlightWeight = 300;
let lowlightOpacity = 0.8;
let ratio = 0.6;

const isNumber = (value) => {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/,/g, "");
  return trimmed !== "" && !isNaN(Number(normalized));
};

function styleWord(word) {
  if (!word.trim()) return word;

  // Calculate the split index based on ratio and ensure at least 1 character
  const splitIndex = Math.max(1, Math.floor(word.length * ratio));
  const firstPart = word.slice(0, splitIndex);
  const secondPart = word.slice(splitIndex);

  const highlight = document.createElement("span");
  highlight.className = "bionic-highlight";
  highlight.style.cssText = `font-weight: ${highlightWeight};`;
  highlight.textContent = firstPart;

  const lowlight = document.createElement("span");
  lowlight.className = "bionic-lowlight";
  lowlight.style.cssText = `font-weight: ${lowlightWeight};`;
  lowlight.textContent = secondPart;

  const container = document.createElement("span");
  container.appendChild(highlight);
  container.appendChild(lowlight);

  return container;
}

function processText(text, weight) {
  // Get the opacity from storage, default to 40%
  chrome.storage.local.get(["lowlightOpacity"], function (result) {
    const opacity = (result.lowlightOpacity ?? 40) / 100;

    // Update the CSS for lowlight parts only
    const style = document.createElement("style");
    style.textContent = `
      .bionic-lowlight {
        opacity: ${opacity};
      }
    `;
    document.head.appendChild(style);
  });

  const container = document.createElement("span");
  container.className = "bionic-reader";

  const parts = text.split(/(\s+)/);

  parts.forEach((part) => {
    if (part.trim()) {
      container.appendChild(styleWord(part));
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });

  return container;
}

function boldFirstLetters() {
  // Skip elements that are likely UI/navigation
  const skipParents = [
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "BUTTON",
    "INPUT",
    "SELECT",
    "OPTION",
    "LABEL",
    "TIME",
    "CODE",
    "PRE",
    "KBD",
    "SAMP",
    "VAR",
    "CITE",
    "ABBR",
    "ACRONYM",
    "NAV",
    "HEADER",
    "FOOTER",
    "MENU",
    "FORM",
    "FIGCAPTION",
  ];

  // Only process text nodes that have enough content
  const MIN_TEXT_LENGTH = 10;

  const textElements = document.evaluate(
    ".//text()[normalize-space()]",
    document.body,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < textElements.snapshotLength; i++) {
    const node = textElements.snapshotItem(i);
    const parent = node.parentElement;

    if (!parent) continue;

    // Skip if parent or any ancestor is in skip list
    let shouldSkip = false;
    let current = parent;
    while (current && current !== document.body) {
      if (
        skipParents.includes(current.tagName) ||
        current.closest(".bionic-reader") ||
        current.getAttribute("role") === "navigation" ||
        current.getAttribute("role") === "menu" ||
        current.getAttribute("role") === "banner"
      ) {
        shouldSkip = true;
        break;
      }
      current = current.parentElement;
    }
    if (shouldSkip) continue;

    // Skip short text that's likely UI elements
    let text = node.textContent.trim();
    if (!text || isNumber(text) || text.length < MIN_TEXT_LENGTH) continue;

    const fragment = document.createDocumentFragment();
    const processedText = processText(node.textContent, highlightWeight);
    processedText.setAttribute("data-original", node.textContent);

    fragment.appendChild(processedText);
    node.parentNode.replaceChild(fragment, node);
  }
}

function removeFormatting() {
  const modifiedElements = document.querySelectorAll(".bionic-reader");
  modifiedElements.forEach((element) => {
    const originalText = element.getAttribute("data-original");
    if (originalText) {
      const textNode = document.createTextNode(originalText);
      element.parentNode.replaceChild(textNode, element);
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "toggle") {
      if (request.enabled) {
        if (request.highlightWeight) {
          highlightWeight = parseInt(request.highlightWeight);
        }
        boldFirstLetters();
      } else {
        removeFormatting();
      }
    } else if (request.action === "updateWeight") {
      highlightWeight = parseInt(request.highlightWeight);
      removeFormatting();
      boldFirstLetters();
    } else if (request.action === "processPreview") {
      // Process preview text and return HTML
      highlightWeight = parseInt(request.weight);
      const processed = processText(request.text, highlightWeight);
      sendResponse({ processedHTML: processed.outerHTML });
    } else if (request.action === "updateOpacity") {
      const opacity = request.lowlightOpacity / 100;
      const style = document.createElement("style");
      style.textContent = `
        .bionic-lowlight {
          opacity: ${opacity};
        }
      `;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.error("Error in content script:", error);
    sendResponse({ error: error.message });
  }
  return true;
});

// Initialize on load if enabled
chrome.storage.local.get(["enabled", "highlightWeight"], function (result) {
  if (result.enabled) {
    if (result.highlightWeight) {
      highlightWeight = parseInt(result.highlightWeight);
    }
    boldFirstLetters();
  }
});
