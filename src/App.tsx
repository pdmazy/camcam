import React, { useState } from 'react';
import { Smartphone, Github, Camera, Sparkles, CheckCircle2, ShieldCheck, Download, Printer, FileText, Sliders } from 'lucide-react';
import { AndroidSimulator } from './components/AndroidSimulator';
import { GitHubActionsGuide } from './components/GitHubActionsGuide';
import appIcon from './assets/images/app_scanner_icon_1788983654452.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'github'>('simulator');
  const [capturedCount, setCapturedCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white" dir="rtl">
      
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img 
              src={appIcon} 
              alt="آیکون اسکنر و فتوکپی مدارک" 
              className="w-11 h-11 rounded-xl shadow-md border border-emerald-500/20 object-cover shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">اسکنر و فتوکپی هوشمند مدارک</h1>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  اندروید نیتیو (Kotlin)
                </span>
                <span className="hidden md:inline-block text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  چاپ A4 • A5 • ۲ در ۱
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تبدیل عکس اسناد به فتوکپی تمیز با کنتراست بالا، تنظیم ابعاد استاندارد چاپ و خروجی در گالری
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>شبیه‌ساز اسکنر اندروید</span>
              {capturedCount > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {capturedCount}
                </span>
              )}
            </button>

            <button
              id="tab-github"
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'github'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Github className="w-3.5 h-3.5 text-slate-800" />
              <span>گیت‌هاب اکشنز و سورس APK</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
        
        {/* Quick Capabilities Highlights Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 px-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-slate-900">امکانات حرفه‌ای فتوکپی:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              فیلتر خودکار فتوکپی سیاه و سفید (حذف سایه و لکه)
            </span>
            <span className="flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              تنظیم برگه خروجی: قطع A4، A5 و کپی ۲ در ۱ (رو و پشت کارت)
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-amber-600" />
              ذخیره در گالری عمومی دستگاه (JPEG) و صدور PDF
            </span>
          </div>
        </div>

        {/* Dual Layout for Wide Screens, or Tabbed for Focused View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Phone Simulator */}
          <div className={`lg:col-span-5 flex flex-col items-center ${activeTab === 'github' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="w-full mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                رابط کاربری گوشی اندروید
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                طراحی شده با استاندارد راست‌چین (RTL)
              </span>
            </div>

            <AndroidSimulator onPhotoCountChange={setCapturedCount} />
          </div>

          {/* Right Column: GitHub Actions Workflow & Code Viewer */}
          <div className={`lg:col-span-7 flex flex-col ${activeTab === 'simulator' ? 'hidden lg:flex' : 'flex'}`}>
            <GitHubActionsGuide />
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>پروژه کاملاً آفلاین با پشتیبانی از ابعاد کاغذ A4 و A5 و ذخیره در گالری در پوشه <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono">/app</code></span>
          <span className="text-[11px] text-emerald-700 font-medium">سازگار با اندروید ۷ تا ۱۵ • کامپایل خودکار APK با GitHub Actions</span>
        </div>
      </footer>

    </div>
  );
}
