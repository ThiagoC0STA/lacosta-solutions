"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Upload,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/renewals", label: "Renovações", icon: FileText },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/import", label: "Importar", icon: Upload },
];

function NavContent({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick: () => void;
}) {
  return (
    <nav className="space-y-1 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        <SheetContent className="p-0 w-64">
          <SheetHeader className="p-4 border-b">
            <h2 className="text-lg font-semibold">Lacosta Solutions</h2>
          </SheetHeader>
          <NavContent
            pathname={pathname}
            onLinkClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:border-r lg:bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Lacosta Solutions
          </h1>
        </div>
        <NavContent pathname={pathname} onLinkClick={() => {}} />
      </aside>
    </>
  );
}
