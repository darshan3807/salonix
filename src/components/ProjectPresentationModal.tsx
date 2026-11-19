import React, { useState } from 'react';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  X, 
  Sparkles, 
  Scissors, 
  Users, 
  Calendar, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  Award,
  Laptop,
  ArrowRight,
  Maximize2
} from 'lucide-react';

interface Slide {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  speakerNotes: string;
}

export const ProjectPresentationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides: Slide[] = [
    {
      id: 1,
      category: "Title Slide",
      title: "SALONIX",
      subtitle: "Multi-Role Smart Salon Appointment & Management Platform",
      speakerNotes: "Good morning/afternoon respected teachers and evaluators. Today, I am proud to present Salonix – a comprehensive, full-stack appointment booking and salon operations platform built, containerized, and deployed live to production.",
      content: (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 mb-6">
            <Scissors className="w-10 h-10 -rotate-45" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Final Year / Diploma Project Pitch
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-serif mb-3">
            SALONIX
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-8">
            Next-Generation Salon Booking, Real-Time Slot Scheduling & Enterprise Management Platform
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl text-left">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Presented By</span>
              <span className="text-sm font-bold text-slate-800">Darshan Fulpagar</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Target Audience</span>
              <span className="text-sm font-bold text-slate-800">Salons & Customers</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Architecture</span>
              <span className="text-sm font-bold text-slate-800">React + Express + SQL</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Status</span>
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Deployed Live
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      category: "Problem Statement",
      title: "Real-World Problems in Salon Industry",
      subtitle: "Why traditional salon visits and phone booking fail both sides",
      speakerNotes: "Explain the ground realities: Long waiting times for customers without real-time slot visibility, and for salon owners, lost revenue from double-bookings and unorganized paper diaries.",
      content: (
        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">1</div>
              <h3 className="text-lg font-bold text-red-900">Customer Pain Points</h3>
            </div>
            <ul className="space-y-3 text-sm text-red-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-500">•</span>
                <span><strong>Unpredictable Waiting:</strong> Customers arrive only to sit 45–90 minutes in crowded queues.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-500">•</span>
                <span><strong>No Price Transparency:</strong> Pricing and hidden costs are unknown until the final billing counter.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-500">•</span>
                <span><strong>Manual Phone Calls:</strong> Endless phone calls to check if their favorite stylist or barber is available.</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">2</div>
              <h3 className="text-lg font-bold text-amber-900">Salon Owners' Dilemma</h3>
            </div>
            <ul className="space-y-3 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong>Double-Booking Errors:</strong> Paper registers and WhatsApp notes lead to overlapping appointments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong>No Slot Intelligence:</strong> Idle chair hours during weekdays with zero revenue tracking.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong>Limited Digital Reach:</strong> Excellent neighborhood salons struggle to attract new clientele without expensive apps.</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      category: "Proposed Solution",
      title: "The Salonix Ecosystem Solution",
      subtitle: "A unified cloud platform bridging customers, salon owners, and administrators",
      speakerNotes: "Highlight how Salonix provides an end-to-end digital experience: browse verified salons, view dynamic slots that prevent double-booking, and give owners powerful revenue and status controls.",
      content: (
        <div className="grid md:grid-cols-3 gap-5 py-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">Customer Portal</h4>
            <p className="text-xs text-slate-500 mb-3">Self-service, instant discovery & zero-wait bookings.</p>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>✓ Filter by city, category, rating</li>
              <li>✓ Transparent menu & service duration</li>
              <li>✓ Live slot picker (prevents double bookings)</li>
              <li>✓ Real-time status tracker (Confirmed/Done)</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <Scissors className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">Salon Owner Hub</h4>
            <p className="text-xs text-slate-500 mb-3">Operational command center for stylists & managers.</p>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>✓ Configure hours, slot durations, breaks</li>
              <li>✓ Add/Edit service catalog & prices</li>
              <li>✓ Accept/Reject/Complete bookings</li>
              <li>✓ Live revenue & appointment metrics</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">Super Admin Console</h4>
            <p className="text-xs text-slate-500 mb-3">Platform governance, verification, and audit.</p>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>✓ Approve or suspend salon listings</li>
              <li>✓ Manage system users and credentials</li>
              <li>✓ System-wide revenue & safety metrics</li>
              <li>✓ Database health & integrity monitoring</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      category: "System Architecture",
      title: "Modern Tech Stack & Dual-DB Support",
      subtitle: "Engineered for flexibility: Production Cloud SQL & Local phpMyAdmin (MySQL/XAMPP)",
      speakerNotes: "Point out your dual database architecture: In cloud production it runs on Google Cloud with PostgreSQL, while locally it works directly with MySQL / phpMyAdmin which teachers are very fond of in diploma curriculums.",
      content: (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-xs font-semibold text-purple-600 uppercase block">Frontend</span>
              <span className="text-base font-bold text-slate-900">React 18 + Vite</span>
              <span className="text-[11px] text-slate-500 block">Tailwind CSS & Lucide</span>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-xs font-semibold text-indigo-600 uppercase block">Backend API</span>
              <span className="text-base font-bold text-slate-900">Node.js Express</span>
              <span className="text-[11px] text-slate-500 block">RESTful endpoints + JWT</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-semibold text-emerald-600 uppercase block">Local Database</span>
              <span className="text-base font-bold text-slate-900">phpMyAdmin / MySQL</span>
              <span className="text-[11px] text-slate-500 block">XAMPP / WAMP Port 3306</span>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
              <span className="text-xs font-semibold text-sky-600 uppercase block">Cloud DB</span>
              <span className="text-base font-bold text-slate-900">PostgreSQL</span>
              <span className="text-[11px] text-slate-500 block">Cloud SQL Port 5432</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              Dynamic Database Adaptation Layer (`src/db/db.ts`)
            </div>
            <p className="text-slate-600">
              The project includes a custom query transpiler that automatically converts PostgreSQL parameterized syntax (<code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">$1, $2</code>) into MySQL positional syntax (<code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">?</code>). This allows running the exact same codebase on localhost with <strong>phpMyAdmin</strong> or online in Cloud Run!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      category: "Database Design",
      title: "Relational Schema & phpMyAdmin Integration",
      subtitle: "7 interconnected tables enforcing data integrity and ACID transactions",
      speakerNotes: "Here is our relational database model. It consists of 7 normalized tables. Explain how foreign key relationships and unique slot constraints prevent race conditions and double bookings.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">1. users</span>
            <p className="text-[11px] text-slate-500">id, email, password (bcrypt), role, phone, city, salon_id</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">2. salons</span>
            <p className="text-[11px] text-slate-500">id, owner_id, name, timing, breaks, slot_duration, city</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">3. services</span>
            <p className="text-[11px] text-slate-500">id, salon_id, category_id, name, price, duration</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">4. categories</span>
            <p className="text-[11px] text-slate-500">Haircut, Spa, Facial, Beard Grooming, Bridal, Kids</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">5. appointments</span>
            <p className="text-[11px] text-slate-500">id, customer_id, salon_id, service_id, date, time, status</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">6. notifications</span>
            <p className="text-[11px] text-slate-500">target_user_id, title, message, read, action_route</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-purple-700 block mb-1">7. favorites</span>
            <p className="text-[11px] text-slate-500">user_id, salon_id (customer saved bookmarks)</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-col justify-center text-center">
            <span className="text-xs font-bold text-purple-800">Export File Ready</span>
            <span className="text-[11px] text-purple-600">salonix_phpmyadmin.sql</span>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      category: "Key Features",
      title: "Core Functionalities Implemented",
      subtitle: "What makes Salonix enterprise-ready and superior to simple booking forms",
      speakerNotes: "Detail the high-level features: strict validation, role-based JWT authentication, concurrency slot locking, dynamic schedule computation, and complete audit history.",
      content: (
        <div className="grid md:grid-cols-2 gap-4 py-2">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Dynamic Slot Generator</h5>
                <p className="text-xs text-slate-600">Calculates working hours minus break periods and cross-references existing bookings in real time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Transaction-Safe Concurrency</h5>
                <p className="text-xs text-slate-600">Uses atomic SQL queries with database transactions to prevent two users from booking the exact same seat.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC)</h5>
                <p className="text-xs text-slate-600">Secure JWT tokens protect customer, owner, and admin endpoints with tailored route guards.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Bcrypt Password Hashing</h5>
                <p className="text-xs text-slate-600">Zero plaintext password storage; all credentials hashed with salt rounds for enterprise security.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Owner Financial Metrics</h5>
                <p className="text-xs text-slate-600">Salon owners see daily, weekly, and total earned revenue with one-click status transitions.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-900">Notification Center</h5>
                <p className="text-xs text-slate-600">Automated in-app alert dispatched on booking confirmation, status change, or cancellation.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      category: "Demonstration & Live Deployment",
      title: "Live Cloud Deployment & Local Execution",
      subtitle: "Ready for interactive demonstration right now",
      speakerNotes: "Emphasize that this is not just theoretical slides. The app is 100% built, fully interactive, passes lint and TypeScript checks, and can be demonstrated live right now in the browser or via localhost.",
      content: (
        <div className="py-4 space-y-4">
          <div className="p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                ● Live Production Cloud URL
              </div>
              <h4 className="text-base font-bold text-slate-900">Salonix Web Application</h4>
              <p className="text-xs text-slate-600">Deployed and accessible from any smartphone, tablet, or laptop.</p>
            </div>
            <a 
              href="https://ais-pre-dw7wl6e4vlx6mw7mly7ofc-907823050121.asia-east1.run.app" 
              target="_blank" 
              rel="noreferrer"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-600/25 flex items-center gap-2 shrink-0"
            >
              <span>Open Live App</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Pre-Loaded Salons</span>
              <span className="text-lg font-bold text-slate-800">7 Active Salons</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Pre-Loaded Services</span>
              <span className="text-lg font-bold text-slate-800">23 Services</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Pre-Loaded Users</span>
              <span className="text-lg font-bold text-slate-800">20 Accounts</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      category: "Conclusion & Future Scope",
      title: "Impact, Future Enhancements & Q&A",
      subtitle: "Scalable commercial expansion roadmap",
      speakerNotes: "Conclude by summarizing the real-world utility of Salonix and outline realistic next phase milestones like UPI payment integration and SMS reminders. Thank your teachers and invite questions.",
      content: (
        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Future Roadmap
            </h4>
            <ul className="text-xs text-slate-600 space-y-2.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span><strong>UPI / Razorpay Integration:</strong> Online advance token payment.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span><strong>WhatsApp / SMS Gateway:</strong> Automated reminder alerts 1 hour before slots.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span><strong>Stylist Commission Tracking:</strong> Auto-split revenue per haircut or service.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span><strong>Mobile App Wrapper:</strong> React Native / Capacitor mobile apps on Play Store.</span>
              </li>
            </ul>
          </div>

          <div className="bg-purple-900 text-white rounded-2xl p-6 flex flex-col justify-center text-center shadow-lg shadow-purple-900/20">
            <Award className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <h3 className="text-2xl font-bold font-serif mb-2">Thank You!</h3>
            <p className="text-xs text-purple-200 mb-4">
              Thank you respected teachers and evaluators for your time and guidance.
            </p>
            <div className="p-3 bg-purple-800/60 rounded-xl border border-purple-700/50 text-xs font-semibold text-purple-100">
              Open for Live Demo & Questions
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Slide {currentSlide + 1} of {slides.length} • {current.category}
              </span>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Salonix Project Pitch Deck
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print / Save as PDF"
              className="p-2 text-slate-600 hover:text-purple-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Content Area */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-serif">
              {current.title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {current.subtitle}
            </p>
          </div>

          <div className="my-2">
            {current.content}
          </div>

          {/* Teacher Speaking Notes */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              What to Say to Your Teacher (Speaker Script)
            </div>
            <p className="text-xs text-amber-800 leading-relaxed italic">
              "{current.speakerNotes}"
            </p>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide 
                    ? 'w-6 bg-purple-600' 
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-purple-600/20"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
