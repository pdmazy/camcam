import React, { useState } from 'react';
import { Smartphone, Github, Camera, Sparkles, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { AndroidSimulator } from './components/AndroidSimulator';
import { GitHubActionsGuide } from './components/GitHubActionsGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'github'>('simulator');
  const [capturedCount, setCapturedCount] = useState(0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-600 selection:text-white" dir="rtl">
      
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-emerald-950">
              <Camera className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">دوربین فارسی</h1>
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  اندروید نیتیو (Kotlin)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                سبک، کاملاً راست‌چین، همراه با ورک‌فلو خودکار بیلد APK در گیت‌هاب اکشنز
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              id="tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>تست و شبیه‌ساز دوربین</span>
              {capturedCount > 0 && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {capturedCount}
                </span>
              )}
            </button>

            <button
              id="tab-github"
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'github'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>گیت‌هاب اکشنز و سورس APK</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Dual Layout for Wide Screens, or Tabbed for Focused View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Phone Simulator */}
          <div className={`lg:col-span-5 flex flex-col items-center ${activeTab === 'github' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="w-full mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                رابط کاربری گوشی اندروید
              </span>
              <span className="text-[11px] text-neutral-500">
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
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 px-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>پروژه کاملاً ماژولار و سبک با پشتیبانی از CameraX و MediaStore در پوشه <code className="text-neutral-400 font-mono">/app</code></span>
          <span className="text-[11px] text-emerald-400/80">سازگار با اندروید ۷ تا ۱۵ • بیلد خودکار با GitHub Actions</span>
        </div>
      </footer>

    </div>
  );
}
