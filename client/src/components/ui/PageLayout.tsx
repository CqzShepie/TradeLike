import type { ReactNode } from "react";
import Sidebar from "../layout/Sidebar";
import PageShell from "./PageShell";

type Props = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function PageLayout({ children, className, contentClassName }: Props) {
  return (
    <PageShell
      sidebar={<Sidebar />}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </PageShell>
  );
}

export default PageLayout;
