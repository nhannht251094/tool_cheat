function byId(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  byId("status").textContent = message;
}

function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return "Current tab";
  }
}

chrome.runtime.sendMessage({ type: "GET_POPUP_STATE" }, (response) => {
  if (!response?.ok) {
    setStatus(response?.error || "Unable to read tab");
    return;
  }
  byId("host").textContent = hostFromUrl(response.url);
  byId("sitePattern").value = response.suggestedPattern || "";
});

byId("openDock").addEventListener("click", () => {
  setStatus("Opening dock...");
  chrome.runtime.sendMessage({ type: "OPEN_DOCK_ON_TAB" }, (response) => {
    setStatus(response?.ok ? "Dock opened" : response?.error || "Open failed");
    if (response?.ok) window.close();
  });
});

byId("alwaysShow").addEventListener("click", () => {
  const pattern = byId("sitePattern").value.trim();
  if (!pattern) {
    setStatus("Enter a URL pattern");
    return;
  }
  setStatus("Saving site...");
  chrome.runtime.sendMessage({ type: "ADD_ALLOWED_SITE", pattern }, (response) => {
    setStatus(response?.ok ? "Saved. Reloading tab..." : response?.error || "Save failed");
    if (response?.ok) window.close();
  });
});

byId("settings").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }, () => window.close());
});
