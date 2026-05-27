'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  FileText,
  Wrench,
  Library,
  Settings,
  Bell,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  assignmentsCount?: number;
  libraryCount?: number;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  assignmentsCount = 10,
  libraryCount = 32,
  mobileMenuOpen = false,
  setMobileMenuOpen
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Home', icon: Home, href: '#' },
    { name: 'My Groups', icon: Users, href: '#' },
    { name: 'Assignments', icon: FileText, href: '/assignments', count: assignmentsCount, active: true },
    { name: 'AI Teacher\'s Toolkit', icon: Wrench, href: '#' },
    { name: 'My Library', icon: Library, href: '#', count: libraryCount }
  ];

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 h-[calc(100vh-2rem)] sticky top-4 my-4 ml-4 px-6 py-8 justify-between shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center bg-white p-1 rounded-xl">
            <img
              src="/vedaaaai.png"
              alt="VedaAI Logo"
              className="h-10 w-auto object-contain cursor-pointer"
              onClick={() => router.push('/assignments')}
            />
          </div>

          {/* Sleek Dark Action Button with Bold Orange Border */}
          <button
            onClick={() => router.push('/create')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold rounded-full shadow-md border-2 border-[#e05e38] transition-all duration-300 transform active:scale-98 relative group"
          >
            <Sparkles className="w-4.5 h-4.5 text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide font-black">Create Assignment</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 mt-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== '#';
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between py-3.5 px-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-bold'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-700'}`} />
                    <span className="text-sm tracking-wide">{item.name}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile and Settings */}
        <div className="flex flex-col gap-6">
          <Link
            href="#"
            className="flex items-center gap-3.5 py-2 px-4 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-semibold tracking-wide">Settings</span>
          </Link>

          {/* Profile Card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-11 h-11 bg-orange-50 border border-orange-100 rounded-full overflow-hidden flex items-center justify-center relative shadow-inner shrink-0">
              <img src="/Avatar.svg" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-800 leading-tight">Delhi Public School</span>
              <span className="text-[11px] font-bold text-gray-400">Bokaro Steel City</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE DRAWER MENU ================= */}
      {mobileMenuOpen && setMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Drawer content */}
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white h-full p-6 justify-between shadow-2xl animate-slide-in">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-white p-0.5 rounded-lg">
                  <img
                    src="/vedaaaai.png"
                    alt="VedaAI Logo"
                    className="h-8.5 w-auto object-contain cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push('/assignments');
                    }}
                  />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/create');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white font-semibold rounded-full shadow-md"
              >
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm">Create Assignment</span>
              </button>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 mt-2">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href) && item.href !== '#';
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between py-3 px-4 rounded-xl ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-bold'
                          : 'text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      {item.count !== undefined && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-600">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom info */}
            <div className="flex flex-col gap-4">
              <Link
                href="#"
                className="flex items-center gap-3.5 py-2 px-4 text-gray-500"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm">Settings</span>
              </Link>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 shadow-inner shrink-0">
                  <img src="/Frame_mobile.svg" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">Delhi Public School</span>
                  <span className="text-xs text-gray-400">Bokaro Steel City</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
