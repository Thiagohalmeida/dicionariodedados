import React from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, AlertTriangle, LayoutDashboard, Plus, Upload, CheckCircle, Clock, Search } from "lucide-react";
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
} from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Dictionaries", href: "/dictionaries", icon: BookOpen },
    { title: "Critical Fields", href: "/fields/critical", icon: AlertTriangle },
  ];

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
          <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">Validador DD</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="mt-4">
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={location === item.href || (location.startsWith(item.href) && item.href !== "/")}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
          <SidebarTrigger />
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
