(async function bootSlotMatrixDock() {
  if (window.__slotMatrixDockMounted) return;

  const DEFAULT_DOCK_ALLOWED_SITES = [
    "https://cheat.staging.enostd.gay/*",
    "https://iframe-tektale.staging.enostd.gay/*",
    "https://cheat.doithe47.com/*",
    "http://www.rampnhan.online/*",
    "https://www.rampnhan.online/*",
    "https://nhannht251094.github.io/tool_cheat/*",
    "http://localhost/*",
    "http://127.0.0.1/*"
  ];

  function sitePatternMatches(pattern, url) {
    const value = String(pattern || "").trim();
    if (!value) return false;
    const normalizedUrl = url.href.replace(/\/$/, "");
    const normalizedOrigin = url.origin.replace(/\/$/, "");
    const normalizedPattern = value.replace(/\/$/, "");
    if (!value.includes("*")) {
      return normalizedUrl.startsWith(normalizedPattern) || normalizedOrigin === normalizedPattern;
    }
    const escaped = value
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(url.href);
  }

  function dockAllowed(storage) {
    if (sessionStorage.getItem("slotMatrixDockOpenOnce") === "true") return true;
    if (storage.dockEnabled === false) return false;
    const sites = Array.isArray(storage.dockAllowedSites)
      ? storage.dockAllowedSites
      : DEFAULT_DOCK_ALLOWED_SITES;
    return sites.some((site) => sitePatternMatches(site, window.location));
  }

  const state = {
    pinned: true,
    collapsed: false,
    status: "Ready",
    statusType: "",
    position: null,
    positionRatio: null,
    dragging: false,
    sending: false,
    formsOpen: false,
    projectsOpen: false,
    settingsOpen: false,
    scrollActiveOnRender: false,
    formsScrollTop: 0,
    forms: [],
    projects: [],
    currentFormId: "",
    currentProjectId: "",
    userId: "",
    userIds: [],
    dockSize: "md",
    dockOrientation: "vertical"
  };

  const storage = await chrome.storage.local.get({
    dockPinned: true,
    dockCollapsed: false,
    dockPosition: null,
    dockPositionRatio: null,
    dockSize: "md",
    dockOrientation: "vertical",
    dockSettingsOpen: false,
    dockFormsOpen: false,
    dockProjectsOpen: false,
    currentFormId: "",
    currentProjectId: "",
    userId: "",
    dockUserId: "",
    dockUserIds: [],
    dockEnabled: true,
    dockAllowedSites: DEFAULT_DOCK_ALLOWED_SITES
  });
  if (!dockAllowed(storage)) return;

  window.__slotMatrixDockMounted = true;

  const host = document.createElement("div");
  host.id = "slot-matrix-dock-host";
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  state.pinned = storage.dockPinned;
  state.collapsed = storage.dockCollapsed;
  state.position = storage.dockPosition;
  state.positionRatio = storage.dockPositionRatio;
  state.dockSize = ["xs", "sm", "md", "lg"].includes(storage.dockSize) ? storage.dockSize : "md";
  state.dockOrientation = ["vertical", "horizontal"].includes(storage.dockOrientation)
    ? storage.dockOrientation
    : "vertical";
  state.settingsOpen = storage.dockSettingsOpen;
  state.formsOpen = storage.dockFormsOpen;
  state.projectsOpen = storage.dockProjectsOpen;
  if (state.settingsOpen) {
    state.formsOpen = false;
    state.projectsOpen = false;
  } else if (state.projectsOpen) {
    state.formsOpen = false;
  }
  state.currentFormId = storage.currentFormId;
  state.currentProjectId = storage.currentProjectId;
  state.userId = storage.dockUserId || storage.userId || "";
  state.userIds = Array.isArray(storage.dockUserIds) ? storage.dockUserIds : [];

  chrome.runtime.sendMessage({ type: "GET_FORMS" }, (response) => {
    if (response?.ok) {
      state.forms = response.forms;
      state.currentFormId = response.currentFormId || state.currentFormId || response.forms[0]?.id || "";
      state.currentProjectId = response.currentProjectId || state.currentProjectId;
      render();
    }
  });

  chrome.runtime.sendMessage({ type: "GET_PROJECTS" }, (response) => {
    if (response?.ok) {
      state.projects = response.projects || [];
      state.currentProjectId = response.currentProjectId || state.projects[0]?.id || "";
      render();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "SLOT_MATRIX_SYNC_FORMS") return;
    const forms = Array.isArray(event.data.forms) ? event.data.forms : [];
    if (!forms.length) return;
    const requestedFormId = event.data.currentFormId;
    const projects = Array.isArray(event.data.projects) ? event.data.projects : [];
    const requestedProjectId = event.data.currentProjectId;
    const projectChanged = Boolean(requestedProjectId && requestedProjectId !== state.currentProjectId);
    const nextCurrentFormId = projectChanged
      ? forms.some((form) => form.id === requestedFormId)
        ? requestedFormId
        : forms[0].id
      : forms.some((form) => form.id === requestedFormId)
      ? requestedFormId
      : forms.some((form) => form.id === state.currentFormId)
        ? state.currentFormId
        : forms[0].id;
    const nextCurrentProjectId = projects.some((project) => project.id === requestedProjectId)
      ? requestedProjectId
      : projects.some((project) => project.id === state.currentProjectId)
        ? state.currentProjectId
        : projects[0]?.id || "";

    chrome.runtime.sendMessage(
      {
        type: "SAVE_FORMS",
        forms,
        currentFormId: nextCurrentFormId,
        projects,
        currentProjectId: nextCurrentProjectId
      },
      (response) => {
        if (!response?.ok) return;
        state.forms = response.forms;
        state.projects = response.projects || projects;
        state.currentFormId = response.currentFormId;
        state.currentProjectId = response.currentProjectId || nextCurrentProjectId;
        if (projectChanged) {
          state.formsScrollTop = 0;
          state.scrollActiveOnRender = false;
        }
        render();
      }
    );
  });

  function styles() {
    return `
      :host {
        all: initial;
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .dock {
        position: fixed;
        left: var(--dock-left, 50%);
        top: var(--dock-top, auto);
        bottom: var(--dock-bottom, 18px);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 12px 10px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 20px;
        background: rgba(12, 12, 12, 0.88);
        box-shadow:
          0 24px 70px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(18px) saturate(1.35);
        transform: var(--dock-transform, translateX(-50%));
        transition: opacity 160ms ease, border-color 160ms ease, background 160ms ease;
        touch-action: none;
        --btn-size: 46px;
        --send-size: 54px;
        --forms-width: 206px;
        --forms-max-height: 270px;
        --forms-gap: 5px;
        --forms-padding: 6px;
        --form-item-min: 34px;
        --form-item-pad-y: 5px;
        --form-item-pad-x: 7px;
        --form-send-size: 26px;
        --form-title-size: 12px;
        --form-meta-size: 9.5px;
      }

      .dock:hover {
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(15, 15, 15, 0.94);
      }

      .dock.horizontal {
        flex-direction: row;
        padding: 10px 14px;
      }

      .dock.xs {
        gap: 6px;
        padding: 7px 6px;
        border-radius: 15px;
        --btn-size: 30px;
        --send-size: 38px;
        --forms-width: 158px;
        --forms-max-height: 205px;
        --forms-gap: 4px;
        --forms-padding: 5px;
        --form-item-min: 28px;
        --form-item-pad-y: 4px;
        --form-item-pad-x: 5px;
        --form-send-size: 22px;
        --form-title-size: 10.5px;
        --form-meta-size: 8px;
      }

      .dock.sm {
        gap: 8px;
        padding: 9px 8px;
        --btn-size: 38px;
        --send-size: 46px;
        --forms-width: 180px;
        --forms-max-height: 235px;
        --form-item-min: 31px;
        --form-send-size: 24px;
        --form-title-size: 11px;
        --form-meta-size: 8.5px;
      }

      .dock.lg {
        gap: 14px;
        padding: 14px 12px;
        --btn-size: 54px;
        --send-size: 64px;
        --forms-width: 238px;
        --forms-max-height: 330px;
        --forms-gap: 6px;
        --forms-padding: 7px;
        --form-item-min: 40px;
        --form-item-pad-y: 7px;
        --form-item-pad-x: 9px;
        --form-send-size: 31px;
        --form-title-size: 13px;
        --form-meta-size: 10px;
      }

      .dock.horizontal.xs {
        padding: 7px 8px;
      }

      .dock.horizontal.sm {
        padding: 8px 11px;
      }

      .dock.horizontal.lg {
        padding: 12px 16px;
      }

      .dock.unpinned {
        opacity: 0.82;
      }

      .dock.collapsed {
        padding: 8px;
      }

      .dock.collapsed > :not([data-action="settings"]):not(.settings-popover) {
        display: none;
      }

      button {
        all: unset;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        width: var(--btn-size);
        height: var(--btn-size);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        color: #b9b9b9;
        background: rgba(28, 28, 28, 0.92);
        cursor: pointer;
        font: 700 20px/1 system-ui, sans-serif;
        user-select: none;
        transition: color 130ms ease, border-color 130ms ease, background 130ms ease, transform 130ms ease;
      }

      .drag-handle {
        all: unset;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        width: var(--btn-size);
        height: 22px;
        border-radius: 10px;
        color: #7c7c7c;
        cursor: grab;
        user-select: none;
      }

      .dock.horizontal .drag-handle {
        width: 22px;
        height: var(--btn-size);
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .drag-handle svg {
        pointer-events: none;
      }

      button:hover {
        border-color: rgba(255, 255, 255, 0.22);
        background: rgba(42, 42, 42, 0.96);
        color: #fff;
      }

      button svg,
      .form-send svg {
        display: block;
        margin: auto;
      }

      .send {
        width: var(--send-size);
        height: var(--send-size);
        border-color: rgba(255, 255, 255, 0.12);
        color: #eeeeee;
        background: rgba(34, 34, 34, 0.94);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }

      .send-wrap {
        position: relative;
        display: grid;
        place-items: center;
        width: var(--send-size);
        height: var(--send-size);
      }

      .send-wrap .send {
        width: 100%;
        height: 100%;
      }

      .send:active {
        transform: scale(0.94);
      }

      .send.sending {
        background: rgba(46, 46, 46, 0.98);
        box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.06);
        animation: dockPulse 720ms ease-in-out infinite;
        cursor: wait;
      }

      .send.sending svg {
        animation: dockSpin 780ms linear infinite;
      }

      .send.ok-flash {
        background: rgba(42, 52, 44, 0.98);
        box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.08);
      }

      .send.error-flash {
        background: rgba(54, 41, 41, 0.98);
        box-shadow: 0 0 0 7px rgba(239, 68, 68, 0.08);
      }

      @keyframes dockPulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(0.96);
        }
      }

      @keyframes dockSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .pin.active {
        color: #ededed;
        border-color: rgba(255, 255, 255, 0.22);
        background: rgba(42, 42, 42, 0.96);
      }

      .clear {
        color: #cfcfcf;
        border-color: rgba(255, 255, 255, 0.12);
      }

      .forms {
        color: #d7d7d7;
        border-color: rgba(255, 255, 255, 0.2);
      }

      .settings {
        color: #d7d7d7;
        border-color: rgba(255, 255, 255, 0.16);
      }

      .settings.active {
        color: #eeeeee;
        border-color: rgba(255, 255, 255, 0.24);
        background: rgba(44, 44, 44, 0.96);
      }

      .size {
        color: #d6d6d6;
        border-color: rgba(255, 255, 255, 0.12);
        font: 900 13px/1 system-ui, sans-serif;
      }

      .rotate {
        color: #d6d6d6;
        border-color: rgba(255, 255, 255, 0.12);
      }

      .status-dot {
        position: absolute;
        right: 2px;
        top: 2px;
        box-sizing: border-box;
        width: 10px;
        height: 10px;
        border: 2px solid rgba(12, 12, 12, 0.96);
        border-radius: 999px;
        background: #777;
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
        opacity: 0.72;
        pointer-events: none;
      }

      .dock.xs .status-dot {
        right: 1px;
        top: 1px;
        width: 8px;
        height: 8px;
        border-width: 1.5px;
      }

      .status-dot.ok {
        background: #2fd36b;
        opacity: 1;
        box-shadow: 0 0 12px rgba(47, 211, 107, 0.46);
      }

      .status-dot.error {
        background: #ff4d47;
        opacity: 1;
        box-shadow: 0 0 13px rgba(255, 77, 71, 0.5);
        animation: statusErrorBlink 260ms ease-in-out 6;
      }

      .status-dot.sending {
        background: #d7d7d7;
        opacity: 1;
        animation: statusSendingBlink 680ms ease-in-out infinite;
      }

      @keyframes statusSendingBlink {
        0%, 100% {
          transform: scale(0.82);
          opacity: 0.48;
        }
        50% {
          transform: scale(1.12);
          opacity: 1;
        }
      }

      @keyframes statusErrorBlink {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(0.58);
          opacity: 0.35;
        }
      }

      .forms-popover,
      .projects-popover {
        position: absolute;
        top: 0;
        display: grid;
        gap: var(--forms-gap);
        width: var(--forms-width);
        max-width: min(var(--forms-width), calc(100vw - 34px));
        max-height: min(var(--forms-max-height), calc(100vh - 34px));
        overflow: auto;
        padding: var(--forms-padding);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 15px;
        background: rgba(13, 13, 13, 0.97);
        box-shadow:
          0 18px 46px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(8px) saturate(1.08);
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        scrollbar-width: thin;
      }

      .forms-popover::-webkit-scrollbar,
      .projects-popover::-webkit-scrollbar {
        width: 3px;
      }

      .forms-popover::-webkit-scrollbar-track,
      .projects-popover::-webkit-scrollbar-track {
        background: transparent;
      }

      .forms-popover::-webkit-scrollbar-thumb,
      .projects-popover::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
      }

      .forms-popover::-webkit-scrollbar-thumb:hover,
      .projects-popover::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.32);
      }

      .forms-popover.open-right,
      .projects-popover.open-right {
        left: calc(100% + 10px);
      }

      .forms-popover.open-left,
      .projects-popover.open-left {
        right: calc(100% + 10px);
      }

      .dock.horizontal .forms-popover.open-bottom,
      .dock.horizontal .projects-popover.open-bottom {
        top: calc(100% + 10px);
        right: auto;
        left: 50%;
        transform: translateX(-50%);
      }

      .settings-popover {
        position: absolute;
        top: 0;
        display: grid;
        gap: 8px;
        width: 188px;
        padding: 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        background: rgba(12, 12, 12, 0.94);
        box-shadow:
          0 24px 70px rgba(0, 0, 0, 0.52),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(18px) saturate(1.3);
      }

      .dock.horizontal .settings-popover {
        grid-auto-flow: row;
      }

      .settings-popover.open-right {
        left: calc(100% + 10px);
      }

      .settings-popover.open-left {
        right: calc(100% + 10px);
      }

      .settings-tools {
        display: grid;
        grid-template-columns: repeat(3, var(--btn-size));
        gap: 8px;
      }

      .settings-user {
        display: grid;
        gap: 5px;
        color: #8b8b8b;
        font: 800 10px/1.1 system-ui, sans-serif;
        text-transform: uppercase;
      }

      .settings-user input {
        all: unset;
        box-sizing: border-box;
        min-width: 0;
        height: 34px;
        padding: 0 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #eeeeee;
        background: rgba(28, 28, 28, 0.94);
        font: 800 12px/1 system-ui, sans-serif;
        text-transform: none;
      }

      .settings-user input:focus {
        border-color: rgba(255, 255, 255, 0.26);
        background: rgba(38, 38, 38, 0.98);
      }

      .settings-user-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 1px;
      }

      .settings-user-chip {
        display: inline-flex;
        max-width: 100%;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(35, 35, 35, 0.9);
      }

      .settings-user-chip button {
        width: auto;
        height: 24px;
        padding: 0 7px;
        border: 0;
        border-radius: 0;
        color: #d7d7d7;
        background: transparent;
        font: 800 10px/1 system-ui, sans-serif;
        text-transform: none;
      }

      .settings-user-chip.active {
        border-color: #ededed;
        background: #ededed;
      }

      .settings-user-chip.active button {
        color: #101010;
      }

      .settings-user-chip .remove-user {
        width: 22px;
        padding: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.12);
        color: #9b9b9b;
        font-size: 13px;
      }

      .settings-user-chip.active .remove-user {
        border-left-color: rgba(0, 0, 0, 0.14);
        color: #303030;
      }

      .settings-user-chip .remove-user:hover {
        color: #ff6b63;
      }

      .form-item,
      .project-item {
        all: unset;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(0, 1fr) var(--form-send-size);
        gap: var(--forms-gap);
        align-items: center;
        min-height: var(--form-item-min);
        padding: var(--form-item-pad-y) var(--form-item-pad-x);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 11px;
        color: #d7d7d7;
        background: rgba(28, 28, 28, 0.82);
        cursor: pointer;
        font: 800 var(--form-title-size)/1.12 system-ui, sans-serif;
      }

      .form-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .form-item.active,
      .project-item.active {
        border-color: rgba(255, 255, 255, 0.24);
        color: #f0f0f0;
        background: rgba(42, 42, 42, 0.94);
      }

      .form-item:hover,
      .project-item:hover {
        border-color: rgba(255, 255, 255, 0.2);
      }

      .form-item small,
      .project-item small {
        overflow: hidden;
        color: #888;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 700 var(--form-meta-size)/1.12 system-ui, sans-serif;
      }

      .form-copy > span {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .project-item {
        grid-template-columns: minmax(0, 1fr);
      }

      .form-send {
        width: var(--form-send-size);
        height: var(--form-send-size);
        border-radius: 8px;
        color: #d8d8d8;
        border-color: rgba(255, 255, 255, 0.12);
        background: rgba(35, 35, 35, 0.92);
      }

      .form-send:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.24);
        background: rgba(50, 50, 50, 0.98);
      }

      @media (max-width: 640px) {
        .dock {
          gap: 8px;
          padding: 10px;
        }

        button {
          width: var(--btn-size);
          height: var(--btn-size);
        }

        .drag-handle {
          width: var(--btn-size);
          height: 20px;
        }

        .dock.horizontal .drag-handle {
          width: 20px;
          height: var(--btn-size);
        }

        .send {
          width: var(--send-size);
          height: var(--send-size);
        }

      }
    `;
  }

  function icon(name) {
    const icons = {
      close:
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      user:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
      send:
        '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
      spinner:
        '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 12a9 9 0 1 1-6.3-8.6"/></svg>',
      down:
        '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
      stop:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="7" width="10" height="10"/></svg>',
      plus:
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
      grip:
        '<svg viewBox="0 0 24 24" width="18" height="24" fill="currentColor"><circle cx="9" cy="5" r="1.4"/><circle cx="15" cy="5" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="19" r="1.4"/><circle cx="15" cy="19" r="1.4"/></svg>',
      pin:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M5 17h14"/><path d="m6 11 4-8h4l4 8"/><path d="M8 11h8"/></svg>',
      pinOff:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 18 18"/><path d="M12 17v5"/><path d="M5 17h12"/><path d="m6 11 3-6"/><path d="M14 3l4 8"/><path d="M8 11h3"/></svg>',
      trash:
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>',
      list:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 7h12M6 12h12M6 17h12"/></svg>',
      project:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z"/></svg>',
      external:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
      rotate:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 0 1-9 9 8.8 8.8 0 0 1-6.2-2.6"/><path d="M3 12a9 9 0 0 1 15.2-6.4"/><path d="M18 2v4h-4"/><path d="M6 22v-4h4"/></svg>',
      settings:
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.82l.04.04a2 2 0 0 1-2.82 2.82l-.04-.04a1.7 1.7 0 0 0-1.82-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.14a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.82.34l-.04.04a2 2 0 0 1-2.82-2.82l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.04A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.82l-.04-.04a2 2 0 0 1 2.82-2.82l.04.04a1.7 1.7 0 0 0 1.82.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 0 1 4 0v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.82-.34l.04-.04a2 2 0 0 1 2.82 2.82l-.04.04a1.7 1.7 0 0 0-.34 1.82V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 0 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></svg>'
    };
    return icons[name];
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function userIdHistory() {
    return Array.from(
      new Set([state.userId, ...state.userIds].map((id) => String(id || "").trim()).filter(Boolean))
    ).slice(0, 6);
  }

  function render() {
    const existingFormsPopover = shadow.querySelector(".forms-popover");
    if (existingFormsPopover && !state.scrollActiveOnRender) {
      state.formsScrollTop = existingFormsPopover.scrollTop;
    }

    const style = state.position
      ? `--dock-left:${state.position.x}px;--dock-top:${state.position.y}px;--dock-bottom:auto;--dock-transform:none;`
      : "";
    const formsDirection =
      state.dockOrientation === "horizontal"
        ? "open-bottom"
        : state.position?.x > window.innerWidth / 2
          ? "open-left"
          : "open-right";
    const projectsDirection = formsDirection;
    const settingsDirection = state.position?.x > window.innerWidth / 2 ? "open-left" : "open-right";
    const sendStateClass =
      state.statusType === "ok" ? "ok-flash" : state.statusType === "error" ? "error-flash" : "";
    shadow.innerHTML = `
      <style>${styles()}</style>
      <div class="dock ${state.pinned ? "" : "unpinned"} ${state.collapsed ? "collapsed" : ""} ${state.dockSize} ${state.dockOrientation}" style="${style}">
        <span class="drag-handle" data-action="drag" title="Drag toolbar">${icon("grip")}</span>
        <button class="clear" data-action="clear" title="Clear session">${icon("trash")}</button>
        <button class="forms" data-action="projects" title="Projects">${icon("project")}</button>
        <span class="send-wrap">
          <button class="send ${state.sending ? "sending" : sendStateClass}" data-action="send" title="Send form data">
            ${state.sending ? icon("spinner") : icon("send")}
          </button>
          <span class="status-dot ${state.sending ? "sending" : state.statusType}" title="${state.status}"></span>
        </span>
        <button class="forms" data-action="forms" title="Loaded forms">${icon("list")}</button>
        <button class="settings ${state.settingsOpen ? "active" : ""}" data-action="settings" title="Dock settings">${icon("settings")}</button>
        ${
          state.settingsOpen
            ? `<div class="settings-popover ${settingsDirection}">
                <div class="settings-tools">
                  <button data-action="open-tool" title="Open tool">${icon("external")}</button>
                  <button class="size" data-action="size" title="Resize dock">${state.dockSize.toUpperCase()}</button>
                  <button class="rotate" data-action="rotate" title="Rotate dock">${icon("rotate")}</button>
                </div>
                <label class="settings-user">
                  Change User ID
                  <input data-action="user-id" value="${escapeAttribute(state.userId)}" placeholder="game_rampusd01" />
                  ${
                    userIdHistory().length
                      ? `<div class="settings-user-list">
                          ${userIdHistory()
                            .map(
                              (userId) => `
                                <span class="settings-user-chip ${userId === state.userId ? "active" : ""}">
                                  <button
                                    data-user-id-choice="${escapeAttribute(userId)}"
                                    title="${escapeAttribute(userId)}"
                                  >${escapeAttribute(userId)}</button>
                                  <button
                                    class="remove-user"
                                    data-user-id-delete="${escapeAttribute(userId)}"
                                    title="Remove ${escapeAttribute(userId)}"
                                  >×</button>
                                </span>
                              `
                            )
                            .join("")}
                        </div>`
                      : ""
                  }
                </label>
              </div>`
            : ""
        }
        ${
          state.projectsOpen
            ? `<div class="projects-popover ${projectsDirection}">
                ${state.projects
                  .map(
                    (project) => `
                      <button class="project-item ${project.id === state.currentProjectId ? "active" : ""}" data-project-id="${project.id}">
                        <span class="form-copy">
                          <span>${project.name}</span>
                          <small>${project.serviceId || ""}</small>
                        </span>
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
        ${
          state.formsOpen
            ? `<div class="forms-popover ${formsDirection}">
                ${state.forms
                  .map(
                    (form) => `
                      <button class="form-item ${form.id === state.currentFormId ? "active" : ""}" data-form-id="${form.id}">
                        <span class="form-copy">
                          <span>${form.name}</span>
                          <small>${form.config?.serviceId ?? ""} · ${form.config?.userId ?? "-"}</small>
                        </span>
                        <span class="form-send" data-send-form-id="${form.id}" title="Send this form">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </span>
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `;

    shadow.querySelector('[data-action="drag"]')?.addEventListener("pointerdown", startDrag);
    shadow.querySelector('[data-action="clear"]')?.addEventListener("click", clearData);
    shadow.querySelector('[data-action="projects"]')?.addEventListener("click", toggleProjects);
    shadow.querySelector('[data-action="forms"]')?.addEventListener("click", toggleForms);
    shadow.querySelector('[data-action="settings"]')?.addEventListener("click", toggleSettings);
    shadow.querySelector('[data-action="open-tool"]')?.addEventListener("click", openTool);
    shadow.querySelector('[data-action="size"]')?.addEventListener("click", cycleSize);
    shadow.querySelector('[data-action="rotate"]')?.addEventListener("click", toggleOrientation);
    shadow.querySelector('[data-action="user-id"]')?.addEventListener("input", updateUserId);
    shadow.querySelector('[data-action="user-id"]')?.addEventListener("blur", rememberCurrentUserId);
    shadow.querySelector('[data-action="user-id"]')?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.currentTarget.blur();
    });
    shadow.querySelectorAll("[data-user-id-choice]").forEach((button) => {
      button.addEventListener("click", () => chooseUserId(button.getAttribute("data-user-id-choice")));
    });
    shadow.querySelectorAll("[data-user-id-delete]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        void deleteUserId(button.getAttribute("data-user-id-delete"));
      });
    });
    shadow.querySelector('[data-action="send"]')?.addEventListener("click", sendForm);
    shadow.querySelectorAll("[data-form-id]").forEach((button) => {
      button.addEventListener("click", () => selectForm(button.getAttribute("data-form-id")));
    });
    shadow.querySelectorAll("[data-project-id]").forEach((button) => {
      button.addEventListener("click", () => selectProject(button.getAttribute("data-project-id")));
    });
    shadow.querySelectorAll("[data-send-form-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        void sendSpecificForm(button.getAttribute("data-send-form-id"));
      });
    });
    shadow.querySelector(".forms-popover")?.addEventListener("scroll", (event) => {
      state.formsScrollTop = event.currentTarget.scrollTop;
    });

    if (state.formsOpen && state.scrollActiveOnRender) {
      state.scrollActiveOnRender = false;
      requestAnimationFrame(() => {
        shadow.querySelector(".form-item.active")?.scrollIntoView({
          block: "center",
          inline: "nearest"
        });
        const popover = shadow.querySelector(".forms-popover");
        if (popover) state.formsScrollTop = popover.scrollTop;
      });
    } else if (state.formsOpen) {
      requestAnimationFrame(() => {
        const popover = shadow.querySelector(".forms-popover");
        if (popover) popover.scrollTop = state.formsScrollTop;
      });
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function dockBounds(rect) {
    return {
      maxX: Math.max(8, window.innerWidth - rect.width - 8),
      maxY: Math.max(8, window.innerHeight - rect.height - 8)
    };
  }

  function ratioFromPosition(position, rect) {
    const bounds = dockBounds(rect);
    return {
      x: bounds.maxX <= 8 ? 0 : clamp((position.x - 8) / (bounds.maxX - 8), 0, 1),
      y: bounds.maxY <= 8 ? 0 : clamp((position.y - 8) / (bounds.maxY - 8), 0, 1)
    };
  }

  async function keepDockInViewport() {
    if (!state.position) return;
    const dock = shadow.querySelector(".dock");
    if (!dock) return;

    const rect = dock.getBoundingClientRect();
    const bounds = dockBounds(rect);
    const ratio = state.positionRatio;
    const next = ratio
      ? {
          x: Math.round(8 + ratio.x * (bounds.maxX - 8)),
          y: Math.round(8 + ratio.y * (bounds.maxY - 8))
        }
      : {
          x: clamp(state.position.x, 8, bounds.maxX),
          y: clamp(state.position.y, 8, bounds.maxY)
        };

    state.position = next;
    dock.style.setProperty("--dock-left", `${next.x}px`);
    dock.style.setProperty("--dock-top", `${next.y}px`);
    dock.style.setProperty("--dock-bottom", "auto");
    dock.style.setProperty("--dock-transform", "none");
    await chrome.storage.local.set({ dockPosition: next });
  }

  function startDrag(event) {
    const dock = shadow.querySelector(".dock");
    if (!dock) return;

    event.preventDefault();
    state.dragging = true;
    const rect = dock.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    function move(moveEvent) {
      if (!state.dragging) return;
      const bounds = dockBounds(rect);
      const x = clamp(moveEvent.clientX - offsetX, 8, bounds.maxX);
      const y = clamp(moveEvent.clientY - offsetY, 8, bounds.maxY);
      state.position = { x: Math.round(x), y: Math.round(y) };
      state.positionRatio = ratioFromPosition(state.position, rect);
      dock.style.setProperty("--dock-left", `${state.position.x}px`);
      dock.style.setProperty("--dock-top", `${state.position.y}px`);
      dock.style.setProperty("--dock-bottom", "auto");
      dock.style.setProperty("--dock-transform", "none");
    }

    async function end() {
      state.dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      if (state.position) {
        await chrome.storage.local.set({
          dockPosition: state.position,
          dockPositionRatio: state.positionRatio
        });
      }
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  function setStatus(status, type = "") {
    state.status = status;
    state.statusType = type;
    updateStatusVisual();
  }

  function setSending(isSending) {
    state.sending = isSending;
    updateStatusVisual();
  }

  function updateStatusVisual() {
    const send = shadow.querySelector('[data-action="send"]');
    const dot = shadow.querySelector(".status-dot");
    if (!send || !dot) return;

    const sendStateClass =
      state.statusType === "ok" ? "ok-flash" : state.statusType === "error" ? "error-flash" : "";
    send.className = `send ${state.sending ? "sending" : sendStateClass}`;
    send.innerHTML = state.sending ? icon("spinner") : icon("send");
    send.setAttribute("title", state.sending ? "Sending form data" : "Send form data");
    dot.className = `status-dot ${state.sending ? "sending" : state.statusType}`;
    dot.setAttribute("title", state.status);
  }

  function updateActiveFormVisual() {
    shadow.querySelectorAll("[data-form-id]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-form-id") === state.currentFormId);
    });
  }

  function updateActiveProjectVisual() {
    shadow.querySelectorAll("[data-project-id]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.getAttribute("data-project-id") === state.currentProjectId
      );
    });
  }

  async function togglePinned() {
    state.pinned = !state.pinned;
    await chrome.storage.local.set({ dockPinned: state.pinned });
    render();
  }

  async function resetPosition() {
    state.position = null;
    state.positionRatio = null;
    await chrome.storage.local.remove(["dockPosition", "dockPositionRatio"]);
    render();
  }

  async function toggleCollapsed() {
    state.collapsed = !state.collapsed;
    await chrome.storage.local.set({ dockCollapsed: state.collapsed });
    render();
  }

  async function toggleForms() {
    state.formsOpen = !state.formsOpen;
    if (state.formsOpen) {
      state.projectsOpen = false;
      state.settingsOpen = false;
    }
    state.scrollActiveOnRender = state.formsOpen;
    await chrome.storage.local.set({
      dockFormsOpen: state.formsOpen,
      dockProjectsOpen: state.projectsOpen,
      dockSettingsOpen: state.settingsOpen
    });
    render();
  }

  async function toggleProjects() {
    state.projectsOpen = !state.projectsOpen;
    if (state.projectsOpen) {
      state.formsOpen = false;
      state.settingsOpen = false;
    }
    await chrome.storage.local.set({
      dockFormsOpen: state.formsOpen,
      dockProjectsOpen: state.projectsOpen,
      dockSettingsOpen: state.settingsOpen
    });
    render();
  }

  async function toggleSettings() {
    state.settingsOpen = !state.settingsOpen;
    if (state.settingsOpen) {
      state.formsOpen = false;
      state.projectsOpen = false;
    }
    await chrome.storage.local.set({
      dockFormsOpen: state.formsOpen,
      dockProjectsOpen: state.projectsOpen,
      dockSettingsOpen: state.settingsOpen
    });
    render();
  }

  function openTool() {
    chrome.runtime.sendMessage({ type: "OPEN_TOOL", url: "http://www.rampnhan.online/" }, (response) => {
      setStatus(response?.ok ? "Tool opened" : response?.error || "Open failed", response?.ok ? "ok" : "error");
    });
  }

  async function updateUserId(event) {
    state.userId = event.currentTarget.value;
    await chrome.storage.local.set({
      dockUserId: state.userId,
      userId: state.userId
    });
    setStatus(state.userId.trim() ? `User ${state.userId.trim()}` : "Using form user", "ok");
  }

  function nextUserIds(userId) {
    const value = String(userId || "").trim();
    if (!value) return state.userIds;
    return [value, ...state.userIds.filter((id) => id !== value)].slice(0, 6);
  }

  async function rememberCurrentUserId() {
    state.userIds = nextUserIds(state.userId);
    await chrome.storage.local.set({
      dockUserId: state.userId,
      userId: state.userId,
      dockUserIds: state.userIds
    });
    render();
  }

  async function chooseUserId(userId) {
    if (!userId) return;
    state.userId = userId;
    state.userIds = nextUserIds(userId);
    await chrome.storage.local.set({
      dockUserId: state.userId,
      userId: state.userId,
      dockUserIds: state.userIds
    });
    setStatus(`User ${state.userId}`, "ok");
    render();
  }

  async function deleteUserId(userId) {
    const value = String(userId || "").trim();
    if (!value) return;
    state.userIds = state.userIds.filter((id) => id !== value);
    if (state.userId === value) state.userId = "";
    await chrome.storage.local.set({
      dockUserId: state.userId,
      userId: state.userId,
      dockUserIds: state.userIds
    });
    setStatus(state.userId ? `User ${state.userId}` : "Using form user", state.userId ? "ok" : "");
    render();
  }

  async function cycleSize() {
    const sizes = ["xs", "sm", "md", "lg"];
    const next = sizes[(sizes.indexOf(state.dockSize) + 1) % sizes.length];
    state.dockSize = next;
    await chrome.storage.local.set({ dockSize: next });
    render();
    await keepDockInViewport();
  }

  async function toggleOrientation() {
    state.dockOrientation = state.dockOrientation === "horizontal" ? "vertical" : "horizontal";
    await chrome.storage.local.set({ dockOrientation: state.dockOrientation });
    render();
    await keepDockInViewport();
  }

  async function selectForm(id) {
    if (!id) return;
    chrome.runtime.sendMessage({ type: "SELECT_FORM", id }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Load failed", "error");
        return;
      }
      state.currentFormId = id;
      updateActiveFormVisual();
      window.postMessage({ type: "SLOT_MATRIX_DOCK_SELECTED_FORM", formId: id }, window.location.origin);
      window.dispatchEvent(new CustomEvent("slot-matrix-dock-selected-form", { detail: { formId: id } }));
      setStatus(`Loaded ${response.form.name}`, "ok");
    });
  }

  async function selectProject(id) {
    if (!id) return;
    chrome.runtime.sendMessage({ type: "SELECT_PROJECT", id }, async (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Project failed", "error");
        return;
      }
      state.currentProjectId = id;
      state.forms = response.forms || [];
      state.currentFormId = response.currentFormId || state.forms[0]?.id || "";
      state.formsScrollTop = 0;
      state.formsOpen = false;
      await chrome.storage.local.set({ dockFormsOpen: false });
      updateActiveProjectVisual();
      render();
      window.postMessage({ type: "SLOT_MATRIX_DOCK_SELECTED_PROJECT", projectId: id }, window.location.origin);
      window.dispatchEvent(
        new CustomEvent("slot-matrix-dock-selected-project", { detail: { projectId: id } })
      );
      setStatus("Project loaded", "ok");
    });
  }

  async function sendSpecificForm(id) {
    if (!id) return;
    state.currentFormId = id;
    updateActiveFormVisual();
    setStatus("Loading...");
    chrome.runtime.sendMessage({ type: "SELECT_FORM", id }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Load failed", "error");
        return;
      }
      state.currentFormId = id;
      updateActiveFormVisual();
      window.postMessage({ type: "SLOT_MATRIX_DOCK_SELECTED_FORM", formId: id }, window.location.origin);
      window.dispatchEvent(new CustomEvent("slot-matrix-dock-selected-form", { detail: { formId: id } }));
      sendForm();
    });
  }

  async function clearData() {
    setStatus("Clearing...");
    chrome.runtime.sendMessage({ type: "CLEAR_DATA" }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Clear failed", "error");
        return;
      }

      const result = response.result;
      setStatus(`Clear ${result.status || "ERR"} / ${result.timeMs}ms`, result.ok ? "ok" : "error");
    });
  }

  async function sendForm() {
    if (state.userId.trim()) {
      state.userIds = nextUserIds(state.userId);
      await chrome.storage.local.set({ dockUserIds: state.userIds });
    }
    state.sending = true;
    setStatus("Sending...");
    chrome.runtime.sendMessage({ type: "SEND_FORM" }, (response) => {
      state.sending = false;
      if (!response?.ok) {
        setStatus(response?.error || "Send failed", "error");
        return;
      }

      const result = response.result;
      setStatus(`${result.status || "ERR"} / ${result.timeMs}ms`, result.ok ? "ok" : "error");
    });
  }

  let resizeTimer = 0;
  function handleViewportResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      void keepDockInViewport();
    }, 80);
  }

  window.addEventListener("resize", handleViewportResize);
  window.visualViewport?.addEventListener("resize", handleViewportResize);

  render();
  void keepDockInViewport();
})();
