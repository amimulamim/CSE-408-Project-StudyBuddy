import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const to = params.get("to") || "/";
    params.delete("to");
    const query = params.toString();
    const target = `${to}${query ? `?${query}` : ""}`;

    setTimeout(() => {
      navigate(target, { replace: true });
    }, 100); // slight delay to ensure router is mounted
  }, []);

  return <p className="text-center mt-20 text-muted-foreground">Redirecting...</p>;
}
