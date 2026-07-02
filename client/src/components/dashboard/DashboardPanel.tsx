import type { ReactNode } from "react";
import { Card, SectionHeader } from "../ui";

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function DashboardPanel({
  title,
  subtitle,
  action,
  children,
}: DashboardPanelProps) {
  return (
    <Card as="section" padding="md" tone="dark" className="h-full">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={action}
        tone="dark"
        className="mb-5"
      />
      {children}
    </Card>
  );
}
