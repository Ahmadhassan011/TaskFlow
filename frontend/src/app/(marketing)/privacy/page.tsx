import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <div className="mt-8 space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Information We Collect</h2>
          <p className="text-sm leading-relaxed">
            TaskFlow collects information you provide directly, including your name, email address,
            and project data you create. We also collect usage data to improve our service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">How We Use Your Information</h2>
          <p className="text-sm leading-relaxed">
            We use your information to provide and improve TaskFlow, communicate with you,
            and ensure the security of our platform.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Data Security</h2>
          <p className="text-sm leading-relaxed">
            We implement appropriate security measures to protect your personal information.
            Your data is encrypted in transit and at rest.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact Us</h2>
          <p className="text-sm leading-relaxed">
            If you have questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
