import { getAuth } from "firebase/auth";
import { HttpMethod } from "@/lib/api";
import { ApiResponse } from "@/lib/api";

// Optional generic for expected successful data response
async function makeRequest<T = unknown>(
  url: string,
  method: HttpMethod,
  body?: unknown
): Promise<T | ApiResponse> {
  const auth = getAuth();
  const user = auth.currentUser;
  let data: ApiResponse = { status: "error", msg: "", data: null };
  if (!user) {
    data.msg = "User not logged in";
    return data;
  }

  try {
    const idToken = await user.getIdToken();
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
      data.msg = "Failed to make request";
      data.data = await response.json();
    }
  } catch (err: any) {
    data.msg = "Request failed";
    data.data = { errorMessage: err.message };
  }

  return data;
}

export {makeRequest};
