const DEFAULT_CONFIG = {
  endpoint: "https://cheat.staging.enostd.gay/9703/inputed",
  serviceId: "9703",
  userId: "game_rampusd01",
  currency: "USD",
  matrixData: "C3,C3,C2,C3,C3,C3,K,C3,A,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3",
  tableFormat: "4,4,4,4,4",
  powerUpSymbolCode:
    "C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3",
  bearerToken: ""
};

const DEFAULT_FORMS = [
  {
    id: "inputed-sample",
    name: "Inputed Sample",
    config: DEFAULT_CONFIG
  },
  {
    id: "all-c3",
    name: "All C3",
    config: {
      ...DEFAULT_CONFIG,
      matrixData: "C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3"
    }
  }
];

const DEFAULT_PROJECTS = [
  {
    id: "project-rampus-inputed",
    name: "RampUSD Inputed",
    serviceId: "9703"
  }
];

async function getConfig() {
  const stored = await chrome.storage.local.get(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG, ...stored };
}

async function getForms(projectId) {
  const stored = await chrome.storage.local.get({
    forms: DEFAULT_FORMS,
    currentFormId: "",
    currentProjectId: DEFAULT_PROJECTS[0].id,
    formsByProject: {},
    currentFormIdsByProject: {}
  });
  const currentProjectId = projectId || stored.currentProjectId || DEFAULT_PROJECTS[0].id;
  const projectForms = stored.formsByProject?.[currentProjectId];
  const forms = projectId
    ? projectForms?.length
      ? projectForms
      : []
    : projectForms?.length
      ? projectForms
      : stored.forms?.length
        ? stored.forms
        : DEFAULT_FORMS;
  const currentFormId =
    stored.currentFormIdsByProject?.[currentProjectId] || stored.currentFormId || forms[0]?.id || "";
  return { forms, currentFormId, currentProjectId };
}

async function getProjects() {
  const stored = await chrome.storage.local.get({
    projects: DEFAULT_PROJECTS,
    currentProjectId: DEFAULT_PROJECTS[0].id
  });
  return {
    projects: stored.projects?.length ? stored.projects : DEFAULT_PROJECTS,
    currentProjectId: stored.currentProjectId || stored.projects?.[0]?.id || DEFAULT_PROJECTS[0].id
  };
}

function toFormBody(config) {
  const params = new URLSearchParams();
  const skipKeys = new Set(["endpoint", "bearerToken", "token", "currency", "currentFormId"]);
  Object.entries(config).forEach(([key, value]) => {
    if (skipKeys.has(key) || value == null || value === "") return;
    if (typeof value === "object") return;
    params.set(key, String(value));
  });
  return params;
}

async function sendFormData() {
  const config = await getConfig();
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
  };

  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
  }

  const start = Date.now();
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: toFormBody(config)
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    timeMs: Date.now() - start,
    body: text
  };
}

function buildClearSessionUrl(config) {
  const endpointUrl = new URL(config.endpoint || DEFAULT_CONFIG.endpoint);
  const serviceId = String(config.serviceId || DEFAULT_CONFIG.serviceId).trim();
  const clearUrl = new URL(`/${encodeURIComponent(serviceId)}/clearsession`, endpointUrl.origin);
  clearUrl.searchParams.set("userId", config.userId || DEFAULT_CONFIG.userId);
  clearUrl.searchParams.set("currency", config.currency || DEFAULT_CONFIG.currency);
  return clearUrl.toString();
}

async function clearSession() {
  const config = await getConfig();
  const headers = {
    Accept: "text/html,application/json,text/plain,*/*",
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
  };

  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
  }

  const body = new URLSearchParams();
  body.set("userId", config.userId || DEFAULT_CONFIG.userId);
  body.set("currency", config.currency || DEFAULT_CONFIG.currency);

  const start = Date.now();
  const url = buildClearSessionUrl(config);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    credentials: "include"
  });
  const text = await response.text();

  return {
    ok: response.ok,
    url,
    status: response.status,
    timeMs: Date.now() - start,
    body: text
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_CONFIG") {
    getConfig().then(sendResponse);
    return true;
  }

  if (message?.type === "SAVE_CONFIG") {
    chrome.storage.local.set(message.config ?? {}).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "OPEN_TOOL") {
    chrome.tabs
      .create({ url: message.url || "https://nhannht251094.github.io/tool_cheat/" })
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "Open failed" })
      );
    return true;
  }

  if (message?.type === "GET_FORMS") {
    getForms(message.projectId).then((result) => sendResponse({ ok: true, ...result }));
    return true;
  }

  if (message?.type === "GET_PROJECTS") {
    getProjects().then((result) => sendResponse({ ok: true, ...result }));
    return true;
  }

  if (message?.type === "SAVE_FORMS") {
    const forms = Array.isArray(message.forms) ? message.forms : DEFAULT_FORMS;
    const currentFormId = message.currentFormId || forms[0]?.id || "";
    const projects = Array.isArray(message.projects) ? message.projects : undefined;
    const currentProjectId = message.currentProjectId || projects?.[0]?.id || "";
    chrome.storage.local
      .get({ formsByProject: {}, currentFormIdsByProject: {} })
      .then((stored) => {
        const formsByProject = { ...stored.formsByProject };
        const currentFormIdsByProject = { ...stored.currentFormIdsByProject };
        if (currentProjectId) {
          formsByProject[currentProjectId] = forms;
          currentFormIdsByProject[currentProjectId] = currentFormId;
        }
        const patch = { forms, currentFormId, formsByProject, currentFormIdsByProject };
        if (projects) patch.projects = projects;
        if (currentProjectId) patch.currentProjectId = currentProjectId;
        return chrome.storage.local.set(patch);
      })
      .then(() => sendResponse({ ok: true, forms, currentFormId, projects, currentProjectId }));
    return true;
  }

  if (message?.type === "SELECT_PROJECT") {
    const currentProjectId = message.id || "";
    getForms(currentProjectId).then(({ forms, currentFormId }) => {
      chrome.storage.local
        .set({ currentProjectId, forms, currentFormId })
        .then(() => sendResponse({ ok: true, currentProjectId, forms, currentFormId }));
    });
    return true;
  }

  if (message?.type === "SELECT_FORM") {
    getForms().then(({ forms, currentProjectId }) => {
      const form = forms.find((item) => item.id === message.id);
      if (!form) {
        sendResponse({ ok: false, error: "Form not found" });
        return;
      }
      chrome.storage.local
        .get({ currentFormIdsByProject: {} })
        .then((stored) =>
          chrome.storage.local.set({
            ...form.config,
            currentFormId: form.id,
            currentFormIdsByProject: {
              ...stored.currentFormIdsByProject,
              [currentProjectId]: form.id
            }
          })
        )
        .then(() => sendResponse({ ok: true, form }));
    });
    return true;
  }

  if (message?.type === "CLEAR_DATA") {
    clearSession()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown clear session error"
        })
      );
    return true;
  }

  if (message?.type === "SEND_FORM") {
    sendFormData()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown extension request error"
        })
      );
    return true;
  }

  return false;
});
