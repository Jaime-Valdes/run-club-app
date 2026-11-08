import { useSyncExternalStore } from "react";

let serverDown = false;
const listeners = new Set();

function setServerDown(value) {
  if (value === serverDown) return;
  serverDown = value;
  listeners.forEach((listener) => listener());
}

let inFlight = 0;
let batchFailed = false;

export function requestStarted() {
  inFlight += 1;
}

// A page load fires several requests at once. One failure keeps the banner up
// until a later batch fully succeeds, even if the others in this batch return OK.
export function requestFinished(failed) {
  inFlight -= 1;
  if (failed) {
    batchFailed = true;
    setServerDown(true);
  }
  if (inFlight === 0) {
    if (!batchFailed) setServerDown(false);
    batchFailed = false;
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useServerDown() {
  return useSyncExternalStore(subscribe, () => serverDown);
}
