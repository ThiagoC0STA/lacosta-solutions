"use client";

import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-64 w-full">
        <main className="p-4 sm:p-6 lg:p-12 mx-auto max-w-[100vw] overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

