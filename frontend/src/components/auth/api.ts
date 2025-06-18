import { makeRequest } from "@/lib/apiCall";

interface ProfileData {
  [key: string]: any;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function signIn() {
    const url = `${API_BASE_URL}/api/v1/auth/login`;
    return makeRequest(url, "POST", null);
}

async function updateUserProfile(profileData:ProfileData) {
    const url = `${API_BASE_URL}/api/v1/user/profile`;
    return makeRequest(url, "PUT", profileData);
}

export { signIn, updateUserProfile };