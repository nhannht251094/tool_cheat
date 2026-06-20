export type ToastTone = "info" | "success" | "error";

export function notify(message: string, tone: ToastTone = "info") {
  window.dispatchEvent(new CustomEvent("slot-matrix-toast", { detail: { message, tone } }));
}

export function scrollToSelector(selector: string) {
  document.querySelector<HTMLElement>(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function focusSelector(selector: string) {
  window.requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus();
  });
}
