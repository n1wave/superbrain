import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  FileText,
  Activity,
  Menu,
  LogOut,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "../ThemeToggle";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Docs", icon: FileText },
  { name: "Tagi", icon: Tag },
  { name: "Team", icon: Users },
  { name: "Analytics", icon: Activity },
  { name: "Settings", icon: Settings },
];

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  currentView,
  setCurrentView
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentView?: string;
  setCurrentView?: (view: string) => void;
}) {
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-midnight/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#050B14] pb-4 sm:max-w-xs sm:pb-6 transition-transform duration-300 ease-in-out lg:static lg:block border-r border-brand-sea/10 dark:border-white/10 shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-brand-sea/10 dark:border-white/10">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-brand-navy dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-brand-bordeaux flex items-center justify-center">
              <span className="text-white text-lg font-bold">S</span>
            </div>
            SuperBRAIN
          </div>
        </div>
        <nav className="flex flex-1 flex-col mt-6 px-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isCurrent = currentView === item.name;
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => setCurrentView && setCurrentView(item.name)}
                        className={cn(
                          isCurrent
                            ? "bg-brand-navy/5 dark:bg-brand-sea/20 text-brand-navy dark:text-white"
                            : "text-brand-midnight dark:text-gray-400 hover:text-brand-navy dark:hover:text-white hover:bg-brand-sea/5 dark:hover:bg-white/5",
                          "group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors text-left",
                        )}
                      >
                        <item.icon
                          className={cn(
                            isCurrent
                              ? "text-brand-orange dark:text-brand-turquoise"
                              : "text-brand-sea dark:text-brand-sea group-hover:text-brand-orange dark:group-hover:text-brand-turquoise",
                            "h-6 w-6 shrink-0 transition-colors",
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <a
                href="#"
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-brand-midnight dark:text-gray-400 hover:bg-brand-bordeaux/5 dark:hover:bg-brand-bordeaux/20 hover:text-brand-bordeaux dark:hover:text-brand-orange transition-colors"
              >
                <LogOut
                  className="h-6 w-6 shrink-0 text-brand-sea group-hover:text-brand-bordeaux dark:group-hover:text-brand-orange transition-colors"
                  aria-hidden="true"
                />
                Log out
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}

export function Header({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-brand-sea/10 dark:border-white/10 bg-white dark:bg-[#050b14]/80 dark:backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-brand-navy dark:text-gray-300 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-brand-sea/10 dark:bg-white/10 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-brand-navy/60"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-brand-midnight placeholder:text-brand-navy/40 focus:ring-0 sm:text-sm bg-transparent outline-none"
            placeholder="Search..."
            type="search"
            name="search"
          />
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <ThemeToggle />
          <button
            type="button"
            className="-m-2.5 p-2.5 text-brand-sea dark:text-gray-400 hover:text-brand-orange dark:hover:text-white relative transition-colors"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full bg-brand-bordeaux ring-2 ring-white dark:ring-[#050B14]" />
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-brand-sea/10 dark:lg:bg-white/10"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <div className="flex items-center gap-x-4 cursor-pointer group">
            <div className="h-8 w-8 rounded-full bg-brand-navy dark:bg-white/10 flex items-center justify-center text-white dark:text-gray-200 font-bold text-sm">
              N1
            </div>
            <span className="hidden lg:flex lg:items-center">
              <span
                className="ml-4 text-sm font-semibold leading-6 text-brand-midnight dark:text-white group-hover:text-brand-orange dark:group-hover:text-brand-orange transition-colors"
                aria-hidden="true"
              >
                Khai One
              </span>
              <ChevronDown
                className="ml-2 h-5 w-5 text-brand-navy/60 dark:text-gray-400 group-hover:text-brand-orange dark:group-hover:text-white transition-colors"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({
  children,
  currentView,
  setCurrentView
}: {
  children: React.ReactNode;
  currentView?: string;
  setCurrentView?: (view: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
