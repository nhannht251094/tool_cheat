import { Download, Pin, PinOff, Plus, Send, Square, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { focusSelector, notify, scrollToSelector } from "../../lib/uiEvents";

const PIN_KEY = "slot-matrix-dock-pinned";

export function FloatingActionDock() {
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) !== "false");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, String(pinned));
  }, [pinned]);

  function sendRequest() {
    document.querySelector<HTMLButtonElement>(".api-panel [data-action='send-request']")?.click();
  }

  if (hidden) return null;

  return (
    <div className={pinned ? "floating-action-dock is-pinned" : "floating-action-dock"}>
      <button title="Close" data-tooltip="Close" onClick={() => setHidden(true)}>
        <X size={22} />
      </button>
      <button title="Users" data-tooltip="Profile" onClick={() => focusSelector(".top-user-field input")}>
        <UserRound size={20} />
      </button>
      <button className="primary" title="Send" data-tooltip="Send" onClick={sendRequest}>
        <Send size={26} />
      </button>
      <button
        title="Download"
        data-tooltip="Export"
        onClick={() => document.querySelector<HTMLButtonElement>("[data-action='export-projects']")?.click()}
      >
        <Download size={22} />
      </button>
      <button
        className="outlined"
        title="Stop"
        data-tooltip="Preview"
        onClick={() => {
          document.querySelector<HTMLButtonElement>("[data-tab='result']")?.click();
          scrollToSelector(".tester-card");
        }}
      >
        <Square size={20} />
      </button>
      <button
        title="Add"
        data-tooltip="Create"
        onClick={() => {
          document.querySelector<HTMLButtonElement>("[data-action='add-field']")?.click();
          notify("Field added.", "success");
        }}
      >
        <Plus size={24} />
      </button>
      <button
        className={pinned ? "dock-pin is-active" : "dock-pin"}
        title={pinned ? "Unpin toolbar" : "Pin toolbar"}
        data-tooltip={pinned ? "Unpin" : "Pin"}
        onClick={() => setPinned((current) => !current)}
      >
        {pinned ? <Pin size={20} /> : <PinOff size={20} />}
      </button>
    </div>
  );
}
