"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Upload,
  Menu,
  Settings,
  Calendar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/renewals", label: "Renovações", icon: FileText },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function NavContent({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick: () => void;
}) {
  return (
    <nav className="space-y-1 ">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 relative group",
              isActive
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border border-primary/20 shadow-md"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:shadow-sm"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 transition-transform duration-200",
              isActive ? "scale-110" : "group-hover:scale-110"
            )} />
            <span>{item.label}</span>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-accent transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        <SheetContent className="p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <h2 className="text-lg font-semibold">Lacosta Solutions</h2>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <NavContent
              pathname={pathname}
              onLinkClick={() => setMobileOpen(false)}
            />
          </div>
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center gap-2 px-2">
              <span className="text-lg font-medium text-foreground">Bem-vindo Luciano</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:border-r lg:border-border lg:bg-card/80 lg:backdrop-blur-xl lg:shadow-xl">
        <div className="flex h-16 items-center border-b border-border px-6 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Lacosta Solutions
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavContent pathname={pathname} onLinkClick={() => {}} />
        </div>
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-2 px-2">
            <span className="text-md font-medium text-foreground">Bem-vindo Luciano</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}
