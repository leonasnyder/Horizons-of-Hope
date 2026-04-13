import Link from 'next/link';
import { CalendarDays, BarChart3, BookOpen, CheckCircle2, Sparkles, Heart } from 'lucide-react';
import ImageCard from '@/components/ImageCard';

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0a0a 0%, #1a0505 30%, #7f1d1d 65%, #c2410c 100%)' }}
      >
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />

        {/* Brand bar */}
        <div className="relative z-10 mb-8 flex items-center gap-3 justify-center">
          <ImageCard src="/logo.png" alt="Horizons of Hope" className="h-12 w-auto object-contain drop-shadow-lg" />
          <span className="text-white/50 text-xl font-light">|</span>
          <span className="text-white/70 text-xs font-bold tracking-[0.3em] uppercase">Horizons of Hope</span>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight mb-5 max-w-4xl">
          Every moment,<br />
          <span style={{
            background: 'linear-gradient(90deg, #fb923c, #f87171)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            every milestone.
          </span>
        </h1>

        {/* Sub */}
        <p className="relative z-10 text-lg sm:text-xl text-white/65 max-w-xl mb-10 leading-relaxed">
          A structured daily scheduler and behavioral data tracker — built for families and caregivers of children with special needs.
        </p>

        {/* CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 rounded-2xl text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)' }}
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 rounded-2xl text-base font-semibold text-white/90 border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all hover:scale-105"
          >
            Sign In
          </Link>
        </div>

        <p className="relative z-10 mt-8 text-white/35 text-xs tracking-wider flex items-center gap-2 justify-center">
          <Heart className="h-3.5 w-3.5 text-red-400" />
          Designed with love for ABA &amp; special education caregivers
        </p>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80 C360 20 1080 20 1440 80 L1440 80 L0 80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-red-600 uppercase mb-3">What it does</span>
            <h2 className="text-4xl font-extrabold text-gray-900">Everything you need, in one place</h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              Stop juggling clipboards and spreadsheets. Horizons of Hope keeps routines consistent and data organized so you can focus on what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CalendarDays className="h-7 w-7" />,
                gradient: 'from-red-500 to-orange-500',
                bg: 'bg-red-50',
                title: 'Daily Scheduler',
                desc: 'Build structured routines with drag-and-drop activities. Set recurring defaults so every morning auto-populates with a consistent schedule.',
              },
              {
                icon: <BarChart3 className="h-7 w-7" />,
                gradient: 'from-orange-500 to-yellow-400',
                bg: 'bg-orange-50',
                title: 'Behavioral Data Tracker',
                desc: 'Log behaviors, goals, and responses with a tap. Track trends over time and export reports to share with your therapy team.',
              },
              {
                icon: <BookOpen className="h-7 w-7" />,
                gradient: 'from-pink-500 to-red-500',
                bg: 'bg-pink-50',
                title: 'Task Library',
                desc: 'Build a personal library of subtasks. Pull from it instantly when creating schedules — no retyping the same things every day.',
              },
            ].map(f => (
              <div key={f.title} className={`${f.bg} rounded-3xl p-8 flex flex-col gap-4`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-md`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold tracking-widest text-red-600 uppercase mb-3">Simple by design</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-16">Up and running in minutes</h2>
          <div className="space-y-6 text-left">
            {[
              { step: '01', title: 'Create your activities', desc: "Add the activities in your child's routine — morning circle, OT, lunch, reading — and assign recurring time slots for each." },
              { step: '02', title: "Open today's schedule", desc: 'Every morning the schedule auto-populates from your defaults. Drag to reorder, resize to adjust, or add one-off activities on the fly.' },
              { step: '03', title: 'Track and celebrate', desc: 'Check off completed activities, log behavioral data, and watch progress build — one milestone at a time.' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <span className="text-5xl font-black text-red-100 leading-none select-none flex-shrink-0 mt-1">{s.step}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature checklist + mock UI ──────────────────────── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-red-600 uppercase mb-3">Packed with features</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Built for your care team</h2>
            <ul className="space-y-3">
              {[
                'Auto-populated daily schedules from recurring defaults',
                'Drag-and-drop reordering with cascade time shifting',
                'Sub-task checklists within each activity',
                'Week-at-a-glance view for planning ahead',
                'Print or export any day or week to a document',
                'Behavioral goal tracking with response logging',
                'Dark mode for evening use',
                'Installable as an app on any phone or tablet (PWA)',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock schedule card */}
          <div className="relative">
            <div
              className="rounded-3xl overflow-hidden shadow-2xl border border-gray-800"
              style={{ background: 'linear-gradient(135deg, #1a0505 0%, #7f1d1d 100%)' }}
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="ml-2 text-white/40 text-xs font-mono">Thursday, April 10</span>
                </div>
                {[
                  { time: '8:00 AM', name: 'Morning Greeting', done: true, color: '#ef4444' },
                  { time: '8:30 AM', name: 'Breakfast & Self-Care', done: true, color: '#f97316' },
                  { time: '9:00 AM', name: 'Circle Time', done: false, color: '#a855f7' },
                  { time: '9:30 AM', name: 'Occupational Therapy', done: false, color: '#3b82f6' },
                  { time: '11:00 AM', name: 'Outdoor Play', done: false, color: '#22c55e' },
                ].map(a => (
                  <div key={a.time} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="text-white/35 text-xs font-mono w-16 flex-shrink-0">{a.time}</span>
                    <div
                      className={`flex-1 rounded-xl px-3 py-2 flex items-center gap-2 transition-opacity ${a.done ? 'opacity-45' : 'opacity-100'}`}
                      style={{ backgroundColor: `${a.color}22`, borderLeft: `3px solid ${a.color}` }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${a.done ? 'border-green-400 bg-green-400' : 'border-white/25'}`}>
                        {a.done && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${a.done ? 'text-white/35 line-through' : 'text-white/85'}`}>
                        {a.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-orange-400 opacity-80" />
            <Sparkles className="absolute -bottom-3 -left-3 h-6 w-6 text-red-400 opacity-60" />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section
        className="py-24 px-6 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #c2410c 100%)' }}
      >
        <h2 className="text-4xl font-extrabold mb-4">Ready to bring structure to your day?</h2>
        <p className="text-white/65 text-lg mb-10 max-w-xl mx-auto">
          Join families building better routines and celebrating every milestone — big and small.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 rounded-2xl text-base font-bold bg-white text-red-700 shadow-xl hover:scale-105 transition-transform"
        >
          Create Your Free Account
        </Link>
        <p className="mt-4 text-white/35 text-xs">No credit card required · Takes less than a minute</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-black py-8 px-6 text-center text-gray-600 text-xs">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ImageCard src="/logo.png" alt="" className="h-6 w-auto opacity-40" />
          <span className="text-gray-500 font-semibold">Horizons of Hope</span>
        </div>
        <p className="text-gray-700">Built with care for families and caregivers everywhere.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/login" className="hover:text-gray-400 transition-colors">Sign In</Link>
          <Link href="/signup" className="hover:text-gray-400 transition-colors">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
