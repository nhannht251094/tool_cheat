import { Download, Pin, PinOff, Plus, Send, Square, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

const PIN_KEY = "slot-matrix-dock-pinned";

export function FloatingActionDock() {
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) !== "false");

  useEffect(() => {
    localStorage.setItem(PIN_KEY, String(pinned));
  }, [pinned]);

  function sendRequest() {
    document.querySelector<HTMLButtonElement>(".api-panel [data-action='send-request']")?.click();
  }

  return (
    <div className={pinned ? "floating-action-dock is-pinned" : "floating-action-dock"}>
      <button title="Close">
        <X size={22} />
      </button>
      <button title="Users">
        <UserRound size={20} />
      </button>
      <button className="primary" title="Send" onClick={sendRequest}>
        <Send size={26} />
      </button>
      <button title="Download">
        <Download size={22} />
      </button>
      <button className="outlined" title="Stop">
        <Square size={20} />
      </button>
      <button title="Add">
        <Plus size={24} />
      </button>
      <button
        className={pinned ? "dock-pin is-active" : "dock-pin"}
        title={pinned ? "Unpin toolbar" : "Pin toolbar"}
        onClick={() => setPinned((current) => !current)}
      >
        {pinned ? <Pin size={20} /> : <PinOff size={20} />}
      </button>
    </div>
  );
}
