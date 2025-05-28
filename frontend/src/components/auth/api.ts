import { makeRequest } from "@/lib/apiCall";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function signIn() {
    const url = `${API_BASE_URL}/api/v1/login`;
    return makeRequest(url, "POST", null);
}

export { signIn };