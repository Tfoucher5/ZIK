import { MAX_ATTEMPTS } from "$lib/shared/zikle/shared.js";

const STORAGE_KEY = "zikle_history"; // { [date]: { attempts: string[], won: boolean, labels: string[] } }

export function loadGuestHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveGuestResult(date, attempts, won, labels) {
  const history = loadGuestHistory();
  history[date] = { attempts, won, labels };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function scoreLabel(won, attempts) {
  return won ? `${attempts}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
}
