import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TaskFlow — Project Management Made Simple",
  description:
    "Manage projects, track tasks, and collaborate with your team. TaskFlow gives you a clear view of every project, task, and deadline.",
  openGraph: {
    title: "TaskFlow — Project Management Made Simple",
    description:
      "Manage projects, track tasks, and collaborate with your team.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
