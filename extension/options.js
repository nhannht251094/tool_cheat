const fields = [
  "endpoint",
  "serviceId",
  "userId",
  "currency",
  "matrixData",
  "tableFormat",
  "powerUpSymbolCode",
  "bearerToken"
];

function byId(id) {
  return document.getElementById(id);
}

chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config) => {
  fields.forEach((field) => {
    byId(field).value = config[field] ?? "";
  });
  byId("dockEnabled").checked = config.dockEnabled !== false;
  byId("dockAllowedSites").value = Array.isArray(config.dockAllowedSites)
    ? config.dockAllowedSites.join("\n")
    : "";
});

byId("save").addEventListener("click", () => {
  const config = {
    ...Object.fromEntries(fields.map((field) => [field, byId(field).value])),
    dockEnabled: byId("dockEnabled").checked,
    dockAllowedSites: byId("dockAllowedSites")
      .value.split(/\n+/)
      .map((site) => site.trim())
      .filter(Boolean)
  };
  chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config }, (response) => {
    byId("status").textContent = response?.ok ? "Saved" : "Save failed";
    setTimeout(() => {
      byId("status").textContent = "Ready";
    }, 1400);
  });
});
