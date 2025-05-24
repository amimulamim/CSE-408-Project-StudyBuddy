// Define allowed HTTP methods
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Define shape of the response
interface ApiResponse {
  status: "success" | "error";
  msg: string;
  data: object; // optional, in case you return a custom object (e.g. conflict info)
}

export type { HttpMethod, ApiResponse };