chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-bionic") {
    chrome.storage.local.get(["enabled"], (result) => {
      const newState = !result.enabled;
      chrome.storage.local.set({ enabled: newState }, () => {
        // Update button state in popup if it's open
        chrome.runtime.sendMessage({ type: "stateChanged", enabled: newState });

        // Get the highlight weight and send it with the toggle message
        chrome.storage.local.get(["highlightWeight"], (weightResult) => {
          const weight = weightResult.highlightWeight ?? 700;

          // Toggle on active tab with the correct message format
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) return;
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "toggle",
              enabled: newState,
              highlightWeight: weight,
            });
          });
        });
      });
    });
  }
});
