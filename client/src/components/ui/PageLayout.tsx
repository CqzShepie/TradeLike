import type { ReactNode } from "react";
import Sidebar from "../layout/Sidebar";
import PageShell from "./PageShell";

type Props = {
  children: ReactNode;
};

function PageLayout({ children }: Props) {
  return <PageShell sidebar={<Sidebar />}>{children}</PageShell>;
}

export default PageLayout;
