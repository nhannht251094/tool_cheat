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
});

byId("save").addEventListener("click", () => {
  const config = Object.fromEntries(fields.map((field) => [field, byId(field).value]));
  chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config }, (response) => {
    byId("status").textContent = response?.ok ? "Saved" : "Save failed";
    setTimeout(() => {
      byId("status").textContent = "Ready";
    }, 1400);
  });
});
