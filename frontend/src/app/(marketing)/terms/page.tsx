import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <div className="mt-8 space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">
            By accessing or using TaskFlow, you agree to be bound by these Terms of Service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Use of Service</h2>
          <p className="text-sm leading-relaxed">
            You may use TaskFlow for lawful purposes only. You are responsible for maintaining
            the confidentiality of your account credentials.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Intellectual Property</h2>
          <p className="text-sm leading-relaxed">
            TaskFlow and its original content, features, and functionality are owned by TaskFlow
            and are protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Termination</h2>
          <p className="text-sm leading-relaxed">
            We may terminate or suspend your account at any time, without prior notice,
            for conduct that we determine violates these Terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact Us</h2>
          <p className="text-sm leading-relaxed">
            If you have questions about these Terms, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
