import type { ReactNode } from "react";

import Sidebar from "../layout/Sidebar";

type Props = {
  children: ReactNode;
};

function PageLayout({ children }: Props) {
  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        {children}
      </section>
    </main>
  );
}

export default PageLayout;