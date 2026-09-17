/* Outbox — the two facts about sending that outlive a screen.
 *
 * `offline` is a real field condition, not a demo switch: in a crawl space
 * there is no signal, sends sit in a queue and a refresh cannot reach the
 * server. Both the list and the open thread have to tell the same story, and
 * the thread is pushed as a closure that would otherwise capture a stale copy
 * of screen state — so this lives outside React and is read with
 * useSyncExternalStore. */
import { useSyncExternalStore } from "react";

type State = { offline: boolean; queued: readonly string[] };

let state: State = { offline: false, queued: [] };
const subs = new Set<() => void>();

function emit(next: State) {
  state = next;
  subs.forEach((f) => f());
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => { subs.delete(f); };
}

export function useOutbox() {
  return useSyncExternalStore(subscribe, () => state);
}

export function setOffline(offline: boolean) {
  emit({ ...state, offline });
}

export function queueMessage(id: string) {
  if (state.queued.includes(id)) return;
  emit({ ...state, queued: [...state.queued, id] });
}

export function unqueueMessage(id: string) {
  if (!state.queued.includes(id)) return;
  emit({ ...state, queued: state.queued.filter((x) => x !== id) });
}

/* Deterministic ids for messages written in this session — no Date.now(),
   no Math.random(), so two runs of the same taps produce the same DOM. */
let seq = 0;
export function nextMessageId(threadId: string) {
  return `m-${threadId}-out-${++seq}`;
}
