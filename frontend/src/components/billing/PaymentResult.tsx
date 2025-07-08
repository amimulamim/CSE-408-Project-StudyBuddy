import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export function PaymentResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);

  const success = query.get("success") === "true";
  const title = query.get("title") || (success ? "Payment Successful" : "Payment Failed");
  const description = query.get("description") || (success ? "Your subscription is now active." : "Something went wrong during payment.");

  const safeText = (text: string, max = 100) => text.slice(0, max);

  useEffect(() => {
    if (!query.has("success")) {
      navigate("/dashboard/billing");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard/billing'), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {success ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className={success ? "text-green-700" : "text-red-700"}>
            {safeText(title)}
          </CardTitle>
          <CardDescription>
            {safeText(description, 200)}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Button onClick={() => navigate('/dashboard/billing')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to billing...</p>
        </CardContent>
      </Card>
    </div>
  );
}
