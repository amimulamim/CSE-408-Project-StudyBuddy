import { ApiResponse } from "@/lib/api";
import { makeRequest } from "@/lib/apiCall";
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function uploadAvatar(file: File) {
    const url = `${API_BASE_URL}/api/v1/user/profile/avatar`;
    const formData = new FormData();
    formData.append("avatar", file);

    return makeRequest<ApiResponse>(url, "POST", formData);
}

async function updateProfileData(data:any){
    const url = `${API_BASE_URL}/api/v1/user/profile`;
    return makeRequest<ApiResponse>(url, "PUT", data);
}

export { uploadAvatar, updateProfileData };
