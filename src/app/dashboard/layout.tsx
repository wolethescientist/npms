'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/shared/sidebar';
import type { Profile } from '@/lib/types/database.types';
import { profiles } from '@/lib/mock-data';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Load demo user from localStorage
    const stored = localStorage.getItem('demo_user');
    if (stored) {
      setProfile(JSON.parse(stored));
    } else {
      // Default to super_admin for demo
      setProfile(profiles[0]);
      localStorage.setItem('demo_user', JSON.stringify(profiles[0]));
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 ml-[260px] min-h-screen transition-all duration-300">
        <div className="p-6 md:p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
