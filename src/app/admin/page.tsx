'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { profiles, mdas } from '@/lib/mock-data';
import type { Profile } from '@/lib/types/database.types';
import {
  Users, Building2, Shield, UserCheck, ScrollText,
} from 'lucide-react';
import AuditLogExplorer from '@/components/audit/AuditLogExplorer';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  mda_admin: 'MDA Admin',
  policy_officer: 'Policy Officer',
  reviewer: 'Reviewer',
  final_approver: 'Final Approver',
  me_officer: 'M&E Officer',
};

const roleColors: Record<string, string> = {
  super_admin:    'bg-purple-100 text-purple-700 border-purple-200',
  mda_admin:      'bg-blue-100 text-blue-700 border-blue-200',
  policy_officer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reviewer:       'bg-amber-100 text-amber-700 border-amber-200',
  final_approver: 'bg-red-100 text-red-700 border-red-200',
  me_officer:     'bg-cyan-100 text-cyan-700 border-cyan-200',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getMDAName(mdaId: string) {
  return mdas.find((m) => m.id === mdaId)?.code ?? 'N/A';
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const stats = [
    { label: 'Total Users',     value: profiles.length,                                                      icon: Users,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Total MDAs',      value: mdas.length,                                                          icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50'},
    { label: 'Admins',          value: profiles.filter((p) => p.role === 'super_admin' || p.role === 'mda_admin').length, icon: Shield,    color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Officers', value: profiles.filter((p) => p.role === 'policy_officer').length,           icon: UserCheck, color: 'text-amber-600',  bg: 'bg-amber-50'  },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage users, MDAs, and review system activity</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview"  className="gap-1.5 text-xs"><Users      className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="audit"     className="gap-1.5 text-xs"><ScrollText className="w-3.5 h-3.5" /> Audit Log</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0F6E56]" /> System Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      currentUser?.id === p.id
                        ? 'border-[#0F6E56]/30 bg-[#0F6E56]/5'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-bold flex items-center justify-center shrink-0">
                      {getInitials(p.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.full_name}
                        {currentUser?.id === p.id && (
                          <span className="ml-1.5 text-[10px] text-[#0F6E56] font-semibold">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{getMDAName(p.mda_id ?? '')}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleColors[p.role] ?? 'bg-muted text-muted-foreground'}`}>
                      {roleLabels[p.role] ?? p.role}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* MDAs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0F6E56]" /> Ministries & Agencies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mdas.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#0F6E56]">{m.code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.sector}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {profiles.filter((p) => p.mda_id === m.id).length} users
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Audit Log ── */}
        <TabsContent value="audit" className="mt-4">
          <AuditLogExplorer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
