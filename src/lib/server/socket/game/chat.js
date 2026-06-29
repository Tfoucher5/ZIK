import { CHAT_MAX_MESSAGES, CHAT_CLEAR_DELAY } from "./config.js";
import { chatHistories } from "../../state.js";

export function getChatHistory(roomId) {
  if (!chatHistories[roomId])
    chatHistories[roomId] = { messages: [], clearTimer: null };
  return chatHistories[roomId];
}

export function scheduleChatClear(roomId) {
  const h = chatHistories[roomId];
  if (!h) return;
  clearTimeout(h.clearTimer);
  h.clearTimer = setTimeout(() => {
    delete chatHistories[roomId];
  }, CHAT_CLEAR_DELAY);
}

export function cancelChatClear(roomId) {
  const h = chatHistories[roomId];
  if (h) clearTimeout(h.clearTimer);
}

export function addChatMessage(roomId, message) {
  const h = getChatHistory(roomId);
  h.messages.push(message);
  if (h.messages.length > CHAT_MAX_MESSAGES) h.messages.shift();
}
