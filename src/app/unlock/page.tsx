import { OtpForm } from "@/components/otp-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function UnlockPage() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <p className="text-sm font-semibold tracking-wide text-teal-600">Internal access</p>
        <h1 className="mt-3 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          Cursor usage
        </h1>
        <p className="mt-4 max-w-md text-center text-sm text-neutral-500">
          Enter the 4-digit team code to open the Classy Endeavors usage
          dashboard.
        </p>
        <div className="mt-10">
          <OtpForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
