export function PendingEmailVerification() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Verify Your Email</h3>
      </div>
      <p className="text-lg mb-4">
        Please check your email for a verification link to complete your registration.
      </p>
      <p className="text-lg mb-4">
        If you haven't received the email, please check your spam folder
      </p>
    </div>
  );
}