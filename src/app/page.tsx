'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, Shield, FileText, BarChart3, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E1F5EE] via-white to-[#E1F5EE]">
      {/* Header */}
      <header className="border-b border-[#0F6E56]/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center shadow-lg shadow-[#0F6E56]/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#085041] tracking-tight">NPMS</h1>
              <p className="text-[10px] text-[#0F6E56]/70 -mt-0.5">National Policy Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-[#0F6E56] hover:text-[#085041]">
              <Link href="/portal">Public Portal</Link>
            </Button>
            <Button asChild className="bg-[#0F6E56] hover:bg-[#085041] shadow-lg shadow-[#0F6E56]/25 transition-all duration-300 hover:shadow-[#0F6E56]/40">
              <Link href="/login">Sign In <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28 animate-fade-in">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-semibold mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse-dot" />
            Federal Republic of Nigeria
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#085041] tracking-tight leading-tight mb-6">
            National Policy<br />
            <span className="text-[#0F6E56]">Management System</span>
          </h2>
          <p className="text-lg text-[#0F6E56]/70 mb-8 max-w-xl leading-relaxed">
            A unified digital platform for drafting, reviewing, approving, publishing, and monitoring government policies across all Ministries, Departments, and Agencies.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-[#0F6E56] hover:bg-[#085041] shadow-xl shadow-[#0F6E56]/25 text-base px-8 transition-all duration-300 hover:shadow-[#0F6E56]/40 hover:-translate-y-0.5">
              <Link href="/login">Access System <ArrowRight className="w-5 h-5 ml-2" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-[#0F6E56]/30 text-[#0F6E56] hover:bg-[#0F6E56]/5 text-base px-8">
              <Link href="/portal">Browse Published Policies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          {[
            { icon: FileText, title: 'Policy Lifecycle', desc: 'Full-cycle management from draft to publication with version control' },
            { icon: Shield, title: 'Approval Workflows', desc: 'Multi-step review & approval chains with full audit trails' },
            { icon: BarChart3, title: 'M&E Dashboard', desc: 'KPI tracking with traffic-light indicators for implementation monitoring' },
            { icon: Users, title: 'Multi-MDA', desc: 'Role-based access for officers, reviewers, and administrators' },
          ].map((f) => (
            <div
              key={f.title}
              className="group bg-white/80 backdrop-blur border border-[#0F6E56]/10 rounded-2xl p-6 hover:shadow-xl hover:shadow-[#0F6E56]/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center mb-4 group-hover:bg-[#0F6E56] group-hover:shadow-lg group-hover:shadow-[#0F6E56]/20 transition-all duration-300">
                <f.icon className="w-6 h-6 text-[#0F6E56] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-bold text-[#085041] mb-1">{f.title}</h3>
              <p className="text-sm text-[#0F6E56]/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alignment Section */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-[#0F6E56] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">Aligned with National Frameworks</h3>
            <p className="text-white/70 max-w-xl mb-8">Built in compliance with NITDA guidelines, NDEPS 2020-2030, and the Government Digital Service Framework.</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                'NDEPS 2020-2030',
                'GDSFRAME Standards',
                'Nigeria Data Protection Regulation',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 backdrop-blur">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#0F6E56]/10 bg-white/60 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#0F6E56]/50">© 2025 Federal Republic of Nigeria — National Policy Management System</p>
          <div className="flex items-center gap-6 text-sm text-[#0F6E56]/50">
            <Link href="/portal" className="hover:text-[#0F6E56] transition-colors">Public Portal</Link>
            <Link href="/login" className="hover:text-[#0F6E56] transition-colors">Staff Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
