import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface PaymentResultProps {
  success: boolean;
  title: string;
  description: string;
}

export function PaymentResult({ success, title, description }: PaymentResultProps) {
  const navigate = useNavigate();

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
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Button 
            onClick={() => navigate('/dashboard/billing')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
