// use the enable and disable buttons to toggle the extension
document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("toggleButton");
  const weightSelect = document.getElementById("weightSelect");

  // Get initial states
  chrome.storage.local.get(["enabled", "highlightWeight"], function (result) {
    const isEnabled = result.enabled ?? false;
    const weight = result.highlightWeight ?? "bold";
    
    toggleButton.textContent = isEnabled ? "Disable" : "Enable";
    weightSelect.value = weight;
  });

  // Handle toggle button
  toggleButton.addEventListener("click", function () {
    chrome.storage.local.get(["enabled"], function (result) {
      const newState = !(result.enabled ?? false);
      console.log("Setting new state:", newState);

      chrome.storage.local.set({ enabled: newState }, function () {
        toggleButton.textContent = newState ? "Disable" : "Enable";
        console.log("Storage updated, sending message to content script");

        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (tabs[0]?.id) {
              try {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { 
                    action: "toggle", 
                    enabled: newState,
                    highlightWeight: weightSelect.value
                  },
                  function (response) {
                    if (chrome.runtime.lastError) {
                      console.log("Please refresh the page or try on a different page");
                      alert("Please refresh the page or try on a different page");
                      return;
                    }
                    console.log("Response from content script:", response);
                  }
                );
              } catch (error) {
                console.error("Error sending message:", error);
                alert("Please refresh the page or try on a different page");
              }
            } else {
              console.error("No active tab found");
              alert("No active tab found");
            }
          }
        );
      });
    });
  });

  // Handle weight selection changes
  weightSelect.addEventListener("change", function() {
    const weight = this.value;
    chrome.storage.local.set({ highlightWeight: weight });
    
    // Update the active tab if extension is enabled
    chrome.storage.local.get(["enabled"], function(result) {
      if (result.enabled) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "updateWeight",
              highlightWeight: weight
            });
          }
        });
      }
    });
  });
});
