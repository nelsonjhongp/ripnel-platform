"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  User,
} from "lucide-react"

import { NavMain } from "@/components/ui/nav-main"
import { NavProjects } from "@/components/ui/nav-projects"
import { NavSecondary } from "@/components/ui/nav-secondary"
import { NavUser } from "@/components/ui/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@/components/ui/sidebar"

import SedeSelector from "./SedeSelector"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Cuenta",
      url: "/account",
      icon: User,
    },
    {
      title: "AdminCrud",
      url: "/admin-crud",
      icon: SquareTerminal,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: PieChart,
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#" },
        { title: "Explorer", url: "#" },
        { title: "Quantum", url: "#" },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#" },
        { title: "Get Started", url: "#" },
        { title: "Tutorials", url: "#" },
        { title: "Changelog", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ],
  navSecondary: [
    { title: "Support", url: "#", icon: LifeBuoy },
    { title: "Feedback", url: "#", icon: Send },
  ],
  projects: [
    { name: "Design Engineering", url: "#", icon: Frame },
    { name: "Sales & Marketing", url: "#", icon: PieChart },
    { name: "Travel", url: "#", icon: Map },
  ],
}

export function SideBarBrand({
  name = "Ripnel",
  subtitle = "Panel principal",
  sectionLabel = "Sección",
  sectionTitle = "Usuarios y Roles",
}: {
  name?: string
  subtitle?: string
  sectionLabel?: string
  sectionTitle?: string
}) {
  return (
    <div className="p-4 text-white">
      <div>
        <Link href="/sidebar" className="flex items-center gap-3">
          <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30">
            <Command className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate text-base font-semibold">{name}</span>
            <span className="truncate text-xs text-white/90">{subtitle}</span>
          </div>
        </Link>

        <div className="mt-4 bg-violet-500/30 p-3 rounded-md">
          <p className="text-sm text-violet-200">{sectionLabel}</p>
          <p className="text-xl font-bold">{sectionTitle}</p>
          <SedeSelector />
        </div>
      </div>
    </div>
  )
}

export function SideBarFooterLogout({ onLogout }: { onLogout?: () => void }) {
  const handleLogout = () => {
    if (onLogout) return onLogout()
    window.location.href = "/"
  }

  return (
    <div className="p-4 bg-violet-800 border-t border-white w-full">
      <button
        onClick={handleLogout}
        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
      >
        Cerrar Sesión
      </button>
    </div>
  )
}

export function AppSidebar({ children, ...props }: React.PropsWithChildren<React.ComponentProps<typeof Sidebar>>) {
  return (
    <div className="min-h-screen flex flex-1 w-full">
      <Sidebar
        variant="sidebar"
        style={
          {
            "--sidebar": "transparent",
            "--sidebar-foreground": "#ffffff",
            "--sidebar-primary": "#ffffff",
            "--sidebar-primary-foreground": "#ffffff",
            "--sidebar-accent": "rgba(255,255,255,0.08)",
            "--sidebar-accent-foreground": "rgba(255,255,255,0.08)",
            "--sidebar-border": "rgba(255,255,255,0.08)",
            "--sidebar-ring": "#ffffff",
          } as React.CSSProperties
        }
        className="border-indigo-100 bg-gradient-to-b from-violet-700 to-violet-900 text-white"
        {...props}
      >
        <SidebarHeader className="p-0">
          <SideBarBrand />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
          <NavProjects projects={data.projects} />
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
          <SideBarFooterLogout />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}

export default AppSidebar
