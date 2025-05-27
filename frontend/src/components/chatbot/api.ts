import { makeRequest } from "@/lib/apiCall";
import type { FileAttachment } from "./chat";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function getResponse(content: string, files?: FileAttachment[], currentChatId?: string) {
    const url = `${API_BASE_URL}/api/v1/ai/chat`;
    const reqBody = new FormData();
    reqBody.append("text", content);
    if (currentChatId) {
      reqBody.append("chatId", currentChatId);
    }
    if (files && files.length > 0) {
      files.forEach((file) => {
        const byteArray = file.bytes || new Uint8Array(); // your Uint8Array raw bytes
        const blob = new Blob([byteArray], { type: file.type });
        reqBody.append('files', blob, file.name);
      });
    }
    return makeRequest(url, "POST", reqBody);
}

export { getResponse };