'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { profiles } from '@/lib/mock-data';
import { Suspense } from 'react';

// Maps seed emails → profile UUIDs
const EMAIL_MAP: Record<string, string> = {
  'adamu.bello@gov.ng':       'b0000000-0000-0000-0000-000000000001',
  'ngozi.okafor@gov.ng':      'b0000000-0000-0000-0000-000000000002',
  'emeka.nwosu@gov.ng':       'b0000000-0000-0000-0000-000000000003',
  'fatima.yusuf@gov.ng':      'b0000000-0000-0000-0000-000000000004',
  'oluwaseun.adeyemi@gov.ng': 'b0000000-0000-0000-0000-000000000005',
  'chioma.eze@gov.ng':        'b0000000-0000-0000-0000-000000000006',
  'ibrahim.musa@gov.ng':      'b0000000-0000-0000-0000-000000000007',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDemoLogin = (userId: string) => {
    setLoading(true);
    setErrorMsg('');
    const user = profiles.find((p) => p.id === userId);
    if (user) {
      localStorage.setItem('demo_user', JSON.stringify(user));
      document.cookie = `demo_user_id=${userId}; path=/; max-age=86400; SameSite=Lax`;
    }
    setTimeout(() => {
      router.push(redirect);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const userId = EMAIL_MAP[email.trim().toLowerCase()];
    if (!userId) {
      setErrorMsg('No account found for that email. Use a demo email like adamu.bello@gov.ng');
      return;
    }
    handleDemoLogin(userId);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#E1F5EE] via-white to-[#E1F5EE]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F6E56] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#085041] to-[#1D9E75]" />
        <div className="relative z-10 text-white max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-8">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">National Policy<br />Management System</h1>
          <p className="text-white/70 leading-relaxed mb-8">
            Secure access for authorized government personnel to manage, review, and monitor national policies across all MDAs.
          </p>
          <div className="space-y-3">
            {[
              'Multi-step approval workflows',
              'Real-time M&E dashboards',
              'Full audit trail compliance',
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-white/80">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#085041]">NPMS</h1>
              <p className="text-[10px] text-[#0F6E56]/60">Policy Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#085041] mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-8">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-1.5">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@gov.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium mb-1.5">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-[#0F6E56] hover:bg-[#085041] text-base shadow-lg shadow-[#0F6E56]/20 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or quick demo access</span>
            </div>
          </div>

          <Card className="border-dashed border-[#0F6E56]/20">
            <CardHeader className="pb-2">
              <p className="text-xs font-semibold text-[#0F6E56]">Demo Accounts</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { id: 'b0000000-0000-0000-0000-000000000001', label: 'Super Admin', sub: 'Full access' },
                { id: 'b0000000-0000-0000-0000-000000000002', label: 'Policy Officer', sub: 'Create & submit' },
                { id: 'b0000000-0000-0000-0000-000000000003', label: 'Reviewer', sub: 'Review & approve' },
                { id: 'b0000000-0000-0000-0000-000000000005', label: 'M&E Officer', sub: 'Monitor KPIs' },
              ].map((demo) => (
                <Button
                  key={demo.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-left justify-start border-border hover:border-[#0F6E56]/40 hover:bg-[#0F6E56]/5 transition-all"
                  onClick={() => handleDemoLogin(demo.id)}
                  disabled={loading}
                >
                  <div>
                    <p className="text-xs font-semibold">{demo.label}</p>
                    <p className="text-[10px] text-muted-foreground">{demo.sub}</p>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link href="/" className="hover:text-[#0F6E56] transition-colors">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F6E56]/30 border-t-[#0F6E56] rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
