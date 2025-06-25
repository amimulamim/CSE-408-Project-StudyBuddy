import { HttpMethod } from "@/lib/api";
import { ApiResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/authState";

async function makeRequest<T = unknown>(
  url: string,
  method: HttpMethod,
  body?: unknown
): Promise<T | ApiResponse> {
  let data: ApiResponse = { status: "error", msg: "", data: null };
  
  console.log('Making request to:', url);
  
  try {
    const user = await getCurrentUser();
    console.log('Current user:', user);
    
    if (!user) {
      console.log('No user found in auth state');
      data.msg = "User not logged in";
      return data;
    }

    const idToken = await user.getIdToken();
    console.log('Got ID token:', idToken ? 'Token exists' : 'No token');
    console.log(idToken);
    const isFormData = body instanceof FormData;

    const req: RequestInit = {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${idToken}`,
      },
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, req);
    
    if (response.ok) {
      data.status = "success";
      data.msg = "Request successful";
      data.data = await response.json();
    } else if (response.status === 409) {
      data.msg = "overlap";
      data.data = await response.json();
    } else {
      const errorData = await response.json();
      console.log('Error response:', errorData);
      data.msg = "Failed to make request";
      data.data = errorData;
    }
  } catch (err: any) {
    console.error('Request error:', err);
    data.msg = "Request failed";
    data.data = { errorMessage: err.message };
  }

  return data;
}

export { makeRequest };
