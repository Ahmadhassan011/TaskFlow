import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { Navbar } from "@/app/(marketing)/(components)/navbar";
import { Footer } from "@/app/(marketing)/(components)/footer";
import { ContactForm } from "./contact-form";
import { SocialLinks } from "@/components/shared/social-links";

export const metadata: Metadata = {
  title: "Contact — TaskFlow",
  description:
    "Get in touch with the TaskFlow team. Questions, feedback, or support — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.04] to-transparent" />
          <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-24">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get in touch
            </h1>
            <p className="mt-4 text-muted-foreground">
              Questions, feedback, or need a hand? We&apos;d love to hear from
              you.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Contact info */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Email us</p>
                    <a
                      href="mailto:hello@taskflow.app"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      hello@taskflow.app
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Response time</p>
                    <p className="text-sm text-muted-foreground">
                      We usually reply within 24 hours.
                    </p>
                  </div>
                </div>
              </div>

              <SocialLinks />
            </div>

            <ContactForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
