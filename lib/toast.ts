type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

export function toast(message: string): void {
  listeners.forEach((fn) => fn(message));
}

export function onToast(fn: ToastListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
