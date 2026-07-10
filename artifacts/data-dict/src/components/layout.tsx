import React from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  AlertTriangle,
  LayoutDashboard,
  Info,
  HelpCircle,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useResetOnboarding } from "@/components/onboarding-modal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const resetOnboarding = useResetOnboarding();

  const navigation = [
    { title: "Painel", href: "/", icon: LayoutDashboard },
    { title: "Dicionários", href: "/dictionaries", icon: BookOpen },
    { title: "Campos Críticos", href: "/fields/critical", icon: AlertTriangle },
    { title: "Config. Supabase", href: "/supabase-config", icon: Settings },
    { title: "Sobre", href: "/about", icon: Info },
  ];

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
          <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">
              Validador DD
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="mt-4">
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    location === item.href ||
                    (location.startsWith(item.href) && item.href !== "/")
                  }
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <button
            onClick={resetOnboarding}
            className="group-data-[collapsible=icon]:hidden flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent"
          >
            <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Ver tutorial de uso</span>
          </button>
          <button
            onClick={resetOnboarding}
            className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent"
            title="Ver tutorial de uso"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
          <SidebarTrigger />
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
