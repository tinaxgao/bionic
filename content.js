let highlightStyle = "font-weight: bold;";
let lowlightStyle = "font-weight: lighter;";
let lowlightOpacity = 0.8;
let ratio = 0.5;

const isNumber = (value) => !isNaN(Number(value));

function styleWord(word) {
  if (!word.trim()) return word; // Return whitespace as-is

  // Calculate the split point based on ratio
  const splitIndex = Math.max(1, Math.round(word.length * ratio));
  const firstPart = word.slice(0, splitIndex);
  const secondPart = word.slice(splitIndex);

  // Create highlight span
  const highlight = document.createElement("span");
  highlight.style.cssText = `${highlightStyle}`;
  highlight.textContent = firstPart;

  // Create lowlight span
  const lowlight = document.createElement("span");
  lowlight.style.cssText = `${lowlightStyle} opacity: ${lowlightOpacity};`;
  lowlight.textContent = secondPart;

  // Combine the parts
  const container = document.createElement("span");
  container.appendChild(highlight);
  container.appendChild(lowlight);

  return container;
}

function boldFirstLetters() {
  console.log("Executing boldFirstLetters()");

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

    if (
      !parent ||
      parent.tagName === "SCRIPT" ||
      parent.tagName === "STYLE" ||
      parent.tagName === "NOSCRIPT" ||
      parent.tagName === "TEXTAREA" ||
      parent.tagName === "BUTTON" ||
      parent.tagName === "INPUT" ||
      parent.tagName === "SELECT" ||
      parent.tagName === "OPTION" ||
      parent.tagName === "LABEL" ||
      parent.tagName === "TIME" ||
      parent.tagName === "CODE" ||
      parent.tagName === "PRE" ||
      parent.tagName === "KBD" ||
      parent.tagName === "SAMP" ||
      parent.tagName === "VAR" ||
      parent.tagName === "CITE" ||
      parent.tagName === "ABBR" ||
      parent.tagName === "ACRONYM" ||
      parent.closest(".bionic-reader")
    ) {
      continue;
    }

    let text = node.textContent.trim();
    if (!text || isNumber(text)) continue;

    // Create container for the modified content
    const fragment = document.createDocumentFragment();
    const container = document.createElement("span");
    container.className = "bionic-reader";
    container.setAttribute("data-original", node.textContent);

    // Split text into words while preserving whitespace
    const parts = node.textContent.split(/(\s+)/);

    parts.forEach((part) => {
      if (part.trim()) {
        // It's a word
        container.appendChild(styleWord(part));
      } else {
        // It's whitespace
        container.appendChild(document.createTextNode(part));
      }
    });

    fragment.appendChild(container);
    node.parentNode.replaceChild(fragment, node);
  }
}

function removeFormatting() {
  console.log("Executing removeFormatting()");
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
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  
  if (request.action === "toggle") {
    if (request.enabled) {
      console.log("Enabling bionic reading");
      if (request.highlightWeight) {
        highlightStyle = `font-weight: ${request.highlightWeight};`;
      }
      boldFirstLetters();
    } else {
      console.log("Disabling bionic reading");
      removeFormatting();
    }
    sendResponse({ success: true });
  } else if (request.action === "updateWeight") {
    highlightStyle = `font-weight: ${request.highlightWeight};`;
    // Re-apply formatting with new weight
    removeFormatting();
    boldFirstLetters();
    sendResponse({ success: true });
  }
  return true;
});

// Check initial state
chrome.storage.local.get(["enabled"], function (result) {
  console.log("Initial state:", result);
  if (result.enabled) {
    boldFirstLetters();
  }
});
