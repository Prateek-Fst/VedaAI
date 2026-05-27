'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Bell, Home, FileText, Library, Wrench, Plus } from 'lucide-react';

interface MobileNavbarProps {
  onMenuToggle: () => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const pathname = usePathname();

  const bottomItems = [
    { name: 'Home', icon: Home, href: '#' },
    { name: 'Assignments', icon: FileText, href: '/assignments' },
    { name: 'Library', icon: Library, href: '#' },
    { name: 'AI Toolkit', icon: Wrench, href: '#' }
  ];

  return (
    <>
      {/* ================= MOBILE HEADER TOP BAR ================= */}
      <header className="lg:hidden flex items-center justify-between bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center bg-white p-0.5 rounded-lg">
          <img
            src="/vedaaaai.png"
            alt="VedaAI Logo"
            className="h-8.5 w-auto object-contain cursor-pointer"
            onClick={() => router.push('/assignments')}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Notification bell with red dot */}
          <button className="relative p-1.5 rounded-full hover:bg-gray-50 text-gray-600 transition-colors">
            <Bell className="w-5.5 h-5.5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
          </button>

          {/* User profile pic */}
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-xs shrink-0">
            <img src="/Frame_mobile.svg" alt="Avatar" className="w-full h-full object-cover" />
          </div>

          {/* Hamburger Menu trigger */}
          <button
            onClick={onMenuToggle}
            className="p-1 text-gray-600 hover:text-gray-900 active:scale-95 transition-transform"
          >
            <Menu className="w-6.5 h-6.5" />
          </button>
        </div>
      </header>

      {/* ================= FLOATING WHITE ACTION BUTTON WITH ORANGE PLUS ================= */}
      <button
        onClick={() => router.push('/create')}
        className="lg:hidden fixed bottom-20 right-6 z-40 bg-white text-orange-500 w-14 h-14 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-100/50"
      >
        <Plus className="w-7 h-7 stroke-[3.5px] text-orange-500" />
      </button>

      {/* ================= FLOATING BOTTOM NAVIGATION BAR ================= */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-zinc-950 text-white rounded-3xl py-3 px-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex items-center justify-around border border-zinc-800/60 backdrop-blur-md">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '#';
          return (
            <button
              key={item.name}
              onClick={() => item.href !== '#' && router.push(item.href)}
              className="flex flex-col items-center gap-1.5 transition-all duration-200 group active:scale-95"
            >
              <item.icon
                className={`w-5.5 h-5.5 transition-colors ${
                  isActive ? 'text-orange-500 stroke-[2.5px]' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              <span
                className={`text-[10px] tracking-wide font-medium ${
                  isActive ? 'text-orange-500 font-bold' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
