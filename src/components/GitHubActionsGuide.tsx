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
    <div className="w-full flex flex-col gap-5" dir="rtl">
      
      {/* GitHub Actions Highlight Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                ورک‌فلو گیت‌هاب اکشنز آماده است
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  اتوماتیک
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ساخت خودکار فایل نصبی (APK) به محض پوش در گیت‌هاب با <code className="text-emerald-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">.github/workflows/build-apk.yml</code>
              </p>
            </div>
          </div>

          <button
            onClick={copyGitCommands}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-stretch sm:self-auto justify-center cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">۱</span>
              <span>ارسال پروژه به گیت‌هاب</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              پروژه حاضر را به یک مخزن در گیت‌هاب خود Push کنید یا از منوی بالای صفحه Export بگیرید.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">۲</span>
              <span>کامپایل خودکار در Cloud</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              گیت‌هاب اکشنز به طور خودکار Gradle 8.9 و Java 17 را اجرا کرده و فایل APK را بیلد می‌کند.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">۳</span>
              <span>دانلود فایل APK قابل نصب</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              در تب Actions گیت‌هاب، از بخش <b>Artifacts</b> فایل <span className="text-emerald-700 font-semibold">PersianCamera-Debug-APK</span> را دانلود کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Modular Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">معماری ماژولار و سبک</h4>
            <p className="text-[11px] text-slate-500">تفکیک دوربین، چاپ A4/A5 و ذخیره</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">سازگار با اندروید ۷ تا ۱۵</h4>
            <p className="text-[11px] text-slate-500">مبتنی بر CameraX و PdfDocument</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">راست‌چین و آفلاین کامل</h4>
            <p className="text-[11px] text-slate-500">تطبیق ۱۰۰٪ با استاندارد RTL اداری</p>
          </div>
        </div>
      </div>

      {/* Code Inspector */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Header with tabs */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">سورس‌کدهای پروژه بومی اندروید</h3>
          </div>

          <button
            onClick={() => handleCopy(selectedFile.content, selectedFile.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            {copiedPath === selectedFile.path ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>کپی این فایل</span>
              </>
            )}
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 bg-slate-100 border-b border-slate-200 text-xs no-scrollbar">
          {ANDROID_PROJECT_FILES.map(file => {
            const isActive = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 font-medium cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-700 font-bold border border-slate-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <span>{file.title.split(' ')[0]}</span>
                <span className="text-[10px] text-slate-500 font-mono">({file.language})</span>
              </button>
            );
          })}
        </div>

        {/* File Metadata */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-600 gap-1 font-mono">
          <span className="text-emerald-700 font-bold">{selectedFile.path}</span>
          <span className="text-slate-500 font-sans">{selectedFile.description}</span>
        </div>

        {/* Code Content Box with Clean Dark High-Contrast Syntax Background */}
        <div className="p-4 bg-slate-950 overflow-x-auto max-h-[420px] text-xs font-mono leading-relaxed text-slate-200 select-text" dir="ltr">
          <pre className="whitespace-pre">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>

    </div>
  );
};
