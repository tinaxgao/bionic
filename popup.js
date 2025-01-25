document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("toggleButton");
  const weightRange = document.getElementById("weightRange");

  if (!toggleButton || !weightRange) {
    console.error("Required elements not found");
    return;
  }

  function updateUI(isEnabled) {
    toggleButton.textContent = isEnabled
      ? "Disable (⌘/Ctrl+B)"
      : "Enable (⌘/Ctrl+B)";
  }

  function updatePreview(weight) {
    // Send message to content script to get processed text
    chrome.runtime.sendMessage({
      action: "processPreview",
      text: "Preview Text",
      weight: weight,
    });
  }

  // Get initial states
  chrome.storage.local.get(["enabled", "highlightWeight"], function (result) {
    const isEnabled = result.enabled ?? false;
    const weight = result.highlightWeight ?? 700;

    updateUI(isEnabled);
    weightRange.value = weight;
    updatePreview(weight);
  });

  // Handle toggle button
  toggleButton.addEventListener("click", function () {
    chrome.storage.local.get(["enabled"], function (result) {
      const newState = !(result.enabled ?? false);

      chrome.storage.local.set({ enabled: newState }, function () {
        updateUI(newState);

        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (!tabs[0]?.id) {
              console.error("No active tab found");
              return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {
              action: "toggle",
              enabled: newState,
              highlightWeight: parseInt(weightRange.value),
            });
          }
        );
      });
    });
  });

  // Handle weight range changes
  weightRange.addEventListener("input", function (e) {
    const weight = parseInt(e.target.value);

    updatePreview(weight);
    chrome.storage.local.set({ highlightWeight: weight });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) return;

      chrome.storage.local.get(["enabled"], function (result) {
        if (result.enabled) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateWeight",
            highlightWeight: weight,
          });
        }
      });
    });
  });

  // Add this to your existing popup.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "stateChanged") {
      const button = document.getElementById("toggleButton");
      button.textContent = message.enabled ? "Disable" : "Enable";
    }
  });
});
