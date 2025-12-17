"use client";

import {
  LayersPlus,
  Home,
  ChartBarBig,
  Settings,
  LogOut,
  ChevronsUpDown,
  User,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Focus Icon
function FocusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// Navigation items
const navItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Analytics", url: "/dashboard/analytics", icon: ChartBarBig },
  { title: "create", url: "/dashboard/create", icon: LayersPlus },
];

// Dropdown menu items
const menuItems = [
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const userInitial =
    user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-zinc-800/50 bg-zinc-900/50"
    >
      {/* Logo */}
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 shadow-lg shadow-indigo-500/10">
            <FocusIcon className="size-6 text-indigo-400" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white group-data-[collapsible=icon]:hidden">
            FocusSpace
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    size="lg"
                    className="gap-3 rounded-xl text-zinc-400 hover:bg-zinc-800/70 hover:text-white data-[active=true]:bg-indigo-500/15 data-[active=true]:text-indigo-400 group-data-[collapsible=icon]:justify-center"
                  >
                    <Link href={item.url}>
                      <item.icon strokeWidth={1.75} className="shrink-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Menu */}
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="gap-3 rounded-xl text-zinc-400 hover:bg-zinc-800/70 hover:text-white data-[state=open]:bg-zinc-800/70 data-[state=open]:text-white group-data-[collapsible=icon]:justify-center"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={36}
                      height={36}
                      className="size-9 min-h-9 min-w-9 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/30"
                    />
                  ) : (
                    <div className="flex size-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500/30 to-violet-500/30 text-sm font-semibold text-indigo-300">
                      {userInitial}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col overflow-hidden text-left group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium text-white">
                      {user?.displayName || "User"}
                    </span>
                    <span className="truncate text-xs text-zinc-500">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-zinc-600 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-zinc-800/80 bg-zinc-900/95 p-2 shadow-xl shadow-black/20 backdrop-blur-sm"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuLabel className="px-2 text-xs font-medium text-zinc-500">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2 bg-zinc-800/80" />

                {menuItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      href={item.url}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-zinc-300 transition-colors focus:bg-zinc-800/80 focus:text-white"
                    >
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="my-2 bg-zinc-800/80" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-red-400 transition-colors focus:bg-red-500/10 focus:text-red-400"
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
