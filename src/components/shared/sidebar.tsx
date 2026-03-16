'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Globe,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  BookOpen,
  Activity,
  ScrollText,
  ListChecks,
  GitBranch,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/types/database.types';

interface SidebarProps {
  profile: Profile | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:    'Super Administrator',
  mda_admin:      'MDA Administrator',
  policy_officer: 'Policy Officer',
  reviewer:       'Reviewer',
  final_approver: 'Final Approver',
  me_officer:     'M&E Officer',
};

const APPROVER_ROLES = ['super_admin', 'mda_admin', 'reviewer', 'final_approver'];
const MONITORING_ROLES = ['super_admin', 'mda_admin', 'me_officer'];
const ALL_ROLES = ['all'];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);

  // Fetch pending approvals count for badge
  useEffect(() => {
    if (!profile || !APPROVER_ROLES.includes(profile.role)) return;
    const supabase = createClient();
    supabase
      .from('workflow_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('is_current', true)
      .then(({ count }) => {
        if (count) setPendingCount(count);
      });
  }, [profile]);

  // Fetch pending workflow request inbox count
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    supabase
      .from('workflow_requests')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', profile.id)
      .eq('status', 'pending')
      .then(({ count }) => {
        if (count) setInboxCount(count);
      });
  }, [profile]);

  const handleLogout = () => {
    localStorage.removeItem('demo_user');
    document.cookie = 'demo_user_id=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
      ],
    },
    {
      label: 'Repository',
      items: [
        { href: '/repository', label: 'Policy Repository', icon: BookOpen, roles: ['all'] },
      ],
    },
    {
      label: 'Policy Work',
      items: [
        { href: '/policies', label: 'Policies', icon: FileText, roles: ['all'] },
        { href: '/tasks', label: 'My Tasks', icon: ListChecks, roles: ['all'] },
        {
          href: '/workflows',
          label: 'Workflows',
          icon: GitBranch,
          roles: ['all'],
          badge: inboxCount > 0 ? inboxCount : undefined,
        },
        {
          href: '/approvals',
          label: 'Approvals',
          icon: CheckSquare,
          roles: APPROVER_ROLES,
          badge: pendingCount > 0 ? pendingCount : undefined,
        },
        { href: '/monitoring', label: 'Monitoring', icon: Activity, roles: MONITORING_ROLES },
      ],
    },
    {
      label: 'Administration',
      items: [
        { href: '/admin', label: 'User & MDA Management', icon: Users, roles: ['super_admin', 'mda_admin'] },
        { href: '/audit', label: 'Audit Trail', icon: ScrollText, roles: ['super_admin'] },
      ],
    },
    {
      label: 'Public',
      items: [
        { href: '/portal', label: 'Public Portal', icon: Globe, roles: ['all'] },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.roles.includes('all') ||
          (profile?.role && item.roles.includes(profile.role))
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
        <div className="w-9 h-9 rounded-lg bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="font-bold text-sm leading-tight text-foreground">NPMS</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Policy Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative',
                      isActive
                        ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/20'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                        isActive ? 'bg-white text-[#0F6E56]' : 'bg-[#0F6E56] text-white'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-border p-3 space-y-1">
        {profile && (
          <div className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg',
            collapsed ? 'justify-center' : ''
          )}>
            <div className="w-8 h-8 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-xs font-bold flex items-center justify-center flex-shrink-0">
              {getInitials(profile.full_name)}
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-sm font-semibold text-foreground truncate">{profile.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </p>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50',
            collapsed ? 'justify-center px-0' : 'justify-start'
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
