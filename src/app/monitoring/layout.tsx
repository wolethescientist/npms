'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/shared/sidebar';
import { profiles } from '@/lib/mock-data';
import type { Profile } from '@/lib/types/database.types';

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) {
      setProfile(JSON.parse(stored));
    } else {
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
