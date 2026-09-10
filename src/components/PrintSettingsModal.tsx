import React, { useRef } from 'react';
import { 
  X, 
  FileText, 
  Layers, 
  Printer, 
  Check, 
  Upload, 
  Scissors, 
  RotateCw, 
  CheckCircle2, 
  Info,
  Sparkles
} from 'lucide-react';
import { PrintSettings, PageSize, LayoutMode, PageOrientation, MarginMode, CapturedPhoto } from '../types';
import { PAPER_DIMENSIONS } from '../utils/printLayout';

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrintSettings;
  onSettingsChange: (newSettings: PrintSettings) => void;
  capturedPhotos: CapturedPhoto[];
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  capturedPhotos
}) => {
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const handleSecondaryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          updateSetting('secondaryPhoto', reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div 
        className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                تنظیمات قطع کاغذ و چیدمان چاپ
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                انتخاب برگه اداری (A4 یا A5) و قالب رو و پشت مدرک
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-800">
          
          {/* Section 1: Exactly 2 Paper Sizes: A4 and A5 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>قطع برگه خروجی (فقط A4 و A5)</span>
              </label>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {settings.pageSize === 'A4' ? 'A4 اداری استاندارد' : 'A5 نیم‌صفحه'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: A4 */}
              <button
                type="button"
                onClick={() => updateSetting('pageSize', 'A4')}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer relative flex flex-col justify-between gap-1.5 ${
                  settings.pageSize === 'A4'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-base text-slate-900">برگه A4</span>
                  {settings.pageSize === 'A4' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">اداری</span>
                  )}
                </div>
                <span className="text-xs font-bold text-emerald-700">۲۱۰ × ۲۹۷ میلی‌متر</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  استاندارد پرونده‌های اداری، دادخواست، اسناد ملکی و فرم‌ها
                </span>
              </button>

              {/* Option 2: A5 */}
              <button
                type="button"
                onClick={() => updateSetting('pageSize', 'A5')}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer relative flex flex-col justify-between gap-1.5 ${
                  settings.pageSize === 'A5'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-base text-slate-900">برگه A5</span>
                  {settings.pageSize === 'A5' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">نیم‌صفحه</span>
                  )}
                </div>
                <span className="text-xs font-bold text-emerald-700">۱۴۸ × ۲۱۰ میلی‌متر</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  مناسب مدارک شناسایی، شناسنامه، فاکتور، قبض و گواهینامه
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Page Orientation */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-600" />
                <span>جهت نمایش و چاپ برگه</span>
              </label>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {settings.orientation === 'landscape' ? 'افقی (Landscape)' : 'عمودی (Portrait)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Portrait */}
              <button
                type="button"
                onClick={() => updateSetting('orientation', 'portrait')}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer flex items-center justify-between gap-2 ${
                  settings.orientation === 'portrait'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <span className="font-black text-sm text-slate-900 block">عمودی (ایستاده)</span>
                  <span className="text-[11px] text-slate-500">مناسب نامه‌های رسمی و اسناد A4</span>
                </div>
                {settings.orientation === 'portrait' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </button>

              {/* Landscape */}
              <button
                type="button"
                onClick={() => updateSetting('orientation', 'landscape')}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer flex items-center justify-between gap-2 ${
                  settings.orientation === 'landscape'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div>
                  <span className="font-black text-sm text-slate-900 block">افقی (خوابیده)</span>
                  <span className="text-[11px] text-slate-500">مناسب مدارک افقی، کارت شناسایی و چک</span>
                </div>
                {settings.orientation === 'landscape' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Section 3: Document Finishing */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            {/* Timestamp Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-xs text-slate-800 block">درج پاورقی رسمی تاریخ و ساعت</span>
                  <span className="text-[10px] text-slate-500">ثبت تاریخ شمسی اسکن در گوشه پایین برگه</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.addTimestampFooter}
                onChange={(e) => updateSetting('addTimestampFooter', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-600">
            قطع انتخاب شده: <strong className="text-emerald-700 font-extrabold">{settings.pageSize === 'A4' ? 'A4 اداری' : 'A5 نیم‌صفحه'}</strong>
          </span>
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition"
          >
            اعمال تنظیمات
          </button>
        </div>
      </div>
    </div>
  );
};
