import React, { useState } from 'react';
import { Github, FileCode2, Copy, Check, Terminal, Layers, Download, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/projectFiles';
import { AndroidProjectFile } from '../types';

export const GitHubActionsGuide: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [gitCommandCopied, setGitCommandCopied] = useState(false);

  const handleCopy = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const gitCommands = `git add .
git commit -m "Add Persian Camera native Android app with GitHub Actions workflow"
git push origin main`;

  const copyGitCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setGitCommandCopied(true);
    setTimeout(() => setGitCommandCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6" dir="rtl">
      
      {/* GitHub Actions Highlight Banner */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                ورک‌فلو گیت‌هاب اکشنز آماده است
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30">
                  اتوماتیک
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                ساخت خودکار فایل نصبی (APK) به محض پوش در گیت‌هاب با <code className="text-emerald-300 bg-neutral-800/80 px-1.5 py-0.5 rounded text-[11px]">.github/workflows/build-apk.yml</code>
              </p>
            </div>
          </div>

          <button
            onClick={copyGitCommands}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 active:scale-95 transition-all self-stretch sm:self-auto justify-center"
          >
            {gitCommandCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-100" />
                <span>دستورات کپی شد!</span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4" />
                <span>کپی دستورات Push به گیت‌هاب</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Step Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">۱</span>
              <span>ارسال پروژه به گیت‌هاب</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              پروژه حاضر را به یک مخزن در گیت‌هاب خود Push کنید یا از منوی بالای صفحه Export بگیرید.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">۲</span>
              <span>کامپایل خودکار در Cloud</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              گیت‌هاب اکشنز به طور خودکار Gradle 8.9 و Java 17 را اجرا کرده و فایل APK را بیلد می‌کند.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">۳</span>
              <span>دانلود فایل APK قابل نصب</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              در تب Actions گیت‌هاب، از بخش <b>Artifacts</b> فایل <span className="text-emerald-300">PersianCamera-Debug-APK</span> را دانلود کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Modular Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">معماری ماژولار و سبک</h4>
            <p className="text-[11px] text-neutral-400">تفکیک لایه‌های دوربین، ذخیره و دسترسی</p>
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">سازگار با اندروید ۷ تا ۱۵</h4>
            <p className="text-[11px] text-neutral-400">مبتنی بر کتابخانه رسمی Jetpack CameraX</p>
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">راست‌چین و فارسی بومی</h4>
            <p className="text-[11px] text-neutral-400">تطبیق کامل با استاندارد RTL اندروید</p>
          </div>
        </div>
      </div>

      {/* Code Inspector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Header with tabs */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">سورس‌کدهای پروژه بومی اندروید</h3>
          </div>

          <button
            onClick={() => handleCopy(selectedFile.content, selectedFile.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
          >
            {copiedPath === selectedFile.path ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>کپی این فایل</span>
              </>
            )}
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 bg-neutral-950 border-b border-neutral-800/80 text-xs no-scrollbar">
          {ANDROID_PROJECT_FILES.map(file => {
            const isActive = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 font-medium ${
                  isActive
                    ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span>{file.title.split(' ')[0]}</span>
                <span className="text-[10px] text-neutral-500 font-mono">({file.language})</span>
              </button>
            );
          })}
        </div>

        {/* File Metadata */}
        <div className="px-4 py-2.5 bg-neutral-950/40 border-b border-neutral-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-400 gap-1 font-mono">
          <span className="text-emerald-400">{selectedFile.path}</span>
          <span className="text-neutral-400 font-sans">{selectedFile.description}</span>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-neutral-950 overflow-x-auto max-h-[420px] text-xs font-mono leading-relaxed text-neutral-300 select-text" dir="ltr">
          <pre className="whitespace-pre">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>

    </div>
  );
};
