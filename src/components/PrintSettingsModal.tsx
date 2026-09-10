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

          {/* Section 2: Layout Mode (Single vs 2-in-1) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>نحوه چیدمان مدرک در برگه</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1 in 1: Single Document */}
              <button
                type="button"
                onClick={() => updateSetting('layoutMode', '1-in-1')}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                  settings.layoutMode === '1-in-1'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs sm:text-sm text-slate-900">تک‌سند (۱ در ۱)</span>
                  {settings.layoutMode === '1-in-1' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                </div>
                <div className="w-full h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1">
                  <div className="w-3/4 h-5/6 bg-emerald-100 border border-emerald-400 rounded flex items-center justify-center text-[10px] text-emerald-900 font-bold">
                    مدرک تکی
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  نمایش یک سند در مرکز برگه {settings.pageSize}
                </span>
              </button>

              {/* 2 in 1: Front + Back on A4 */}
              <button
                type="button"
                onClick={() => {
                  updateSetting('layoutMode', '2-in-1');
                  updateSetting('pageSize', 'A4');
                }}
                className={`p-3.5 rounded-xl border-2 text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                  settings.layoutMode === '2-in-1'
                    ? 'border-emerald-600 bg-emerald-50 text-slate-900 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">۲ در ۱ (رو و پشت)</span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded font-bold">کارت ملی</span>
                  </div>
                  {settings.layoutMode === '2-in-1' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                </div>
                <div className="w-full h-12 bg-white border border-slate-200 rounded-lg flex flex-col justify-between p-1">
                  <div className="w-full h-[45%] bg-emerald-100 border border-emerald-400 rounded flex items-center justify-center text-[9px] text-emerald-900 font-bold">
                    سند ۱ (روی کارت)
                  </div>
                  <div className="border-t border-dashed border-slate-300 my-0.5"></div>
                  <div className="w-full h-[45%] bg-blue-100 border border-blue-400 rounded flex items-center justify-center text-[9px] text-blue-900 font-bold">
                    سند ۲ (پشت کارت)
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  چاپ دو طرف کارت روی یک برگه A4 با خط برش
                </span>
              </button>
            </div>
          </div>

          {/* If 2-in-1: Select/Upload Secondary Document */}
          {settings.layoutMode === '2-in-1' && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700" />
                  تصویر سند دوم (پشت کارت ملی):
                </span>
                {settings.secondaryPhoto && (
                  <button
                    onClick={() => updateSetting('secondaryPhoto', undefined)}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
                  >
                    حذف سند دوم
                  </button>
                )}
              </div>

              {settings.secondaryPhoto ? (
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-amber-200">
                  <img
                    src={settings.secondaryPhoto}
                    alt="پشت مدرک"
                    className="w-16 h-12 object-cover rounded border border-slate-200"
                  />
                  <div className="flex-1 text-right">
                    <span className="text-xs font-bold text-slate-800 block">تصویر پشت مدرک ثبت شده است</span>
                    <span className="text-[10px] text-slate-500">در نیمه پایینی برگه A4 درج خواهد شد</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-amber-800">
                    برای چاپ ۲ در ۱، تصویر پشت مدرک را از گالری بارگذاری کنید یا همان تصویر تکرار خواهد شد:
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => secondaryFileInputRef.current?.click()}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>بارگذاری تصویر پشت مدرک</span>
                    </button>
                    <input
                      ref={secondaryFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSecondaryUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Document Margin and Finishing */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            {/* Cut Line Toggle (for 2-in-1) */}
            {settings.layoutMode === '2-in-1' && (
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-slate-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">رسم خط‌چین برش و تا</span>
                    <span className="text-[10px] text-slate-500">افزودن خط‌چین وسط برگه برای برش منظم کارت</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.addCutLine}
                  onChange={(e) => updateSetting('addCutLine', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            )}

            {/* Timestamp Toggle */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-slate-600" />
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
