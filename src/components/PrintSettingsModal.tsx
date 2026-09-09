import React, { useRef } from 'react';
import { 
  Sliders, 
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
  Calendar,
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
        className="bg-white text-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                تنظیمات ابعاد کاغذ و چیدمان خروجی
              </h3>
              <p className="text-[11px] text-slate-500">
                تنظیم قطع چاپ (A4 / A5) و چیدمان تک‌سند یا دو سند در یک برگ (۲ در ۱)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* Section 1: Page Size Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>قطع کاغذ خروجی (Paper Size)</span>
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {PAPER_DIMENSIONS[settings.pageSize].nameFa}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PAPER_DIMENSIONS) as PageSize[]).map((size) => {
                const isSelected = settings.pageSize === size;
                const info = PAPER_DIMENSIONS[size];
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSetting('pageSize', size)}
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <span className="font-extrabold text-sm">{size}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{info.width}×{info.height} mm</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {PAPER_DIMENSIONS[settings.pageSize].descriptionFa}
            </p>
          </div>

          {/* Section 2: Layout Mode (1-in-1, 2-in-1 on A4, 4-in-1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>چیدمان تعداد سند در یک صفحه (Layout)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1 in 1 */}
              <button
                type="button"
                onClick={() => updateSetting('layoutMode', '1-in-1')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                  settings.layoutMode === '1-in-1'
                    ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">تک‌سند (۱ در ۱)</span>
                  {settings.layoutMode === '1-in-1' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                {/* Visual diagram */}
                <div className="w-full h-12 bg-white border border-slate-200 rounded flex items-center justify-center p-1">
                  <div className="w-3/4 h-5/6 bg-emerald-100 border border-emerald-300 rounded flex items-center justify-center text-[9px] text-emerald-800 font-bold">
                    مدرک تکی
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">
                  یک سند در مرکز برگه {settings.pageSize}
                </span>
              </button>

              {/* 2 in 1 */}
              <button
                type="button"
                onClick={() => {
                  updateSetting('layoutMode', '2-in-1');
                  // Recommended to use A4 for 2-in-1
                  if (settings.pageSize === 'A5') {
                    updateSetting('pageSize', 'A4');
                  }
                }}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                  settings.layoutMode === '2-in-1'
                    ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs">۲ در ۱ (رو و پشت)</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-1 rounded font-bold">پیشنهادی</span>
                  </div>
                  {settings.layoutMode === '2-in-1' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                {/* Visual diagram */}
                <div className="w-full h-12 bg-white border border-slate-200 rounded flex flex-col justify-between p-1">
                  <div className="w-full h-[45%] bg-emerald-100 border border-emerald-300 rounded flex items-center justify-center text-[8px] text-emerald-800 font-bold">
                    سند ۱ (روی کارت)
                  </div>
                  <div className="border-t border-dashed border-slate-300 my-0.5"></div>
                  <div className="w-full h-[45%] bg-blue-50 border border-blue-200 rounded flex items-center justify-center text-[8px] text-blue-800 font-bold">
                    سند ۲ (پشت کارت)
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">
                  دو سند در یک برگه A4 با خط برش
                </span>
              </button>

              {/* 4 in 1 */}
              <button
                type="button"
                onClick={() => updateSetting('layoutMode', '4-in-1')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                  settings.layoutMode === '4-in-1'
                    ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">۴ در ۱ (شبکه‌ای)</span>
                  {settings.layoutMode === '4-in-1' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                {/* Visual diagram */}
                <div className="w-full h-12 bg-white border border-slate-200 rounded grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
                  <div className="bg-emerald-100 rounded text-[7px] flex items-center justify-center font-bold text-emerald-800">۱</div>
                  <div className="bg-emerald-100 rounded text-[7px] flex items-center justify-center font-bold text-emerald-800">۲</div>
                  <div className="bg-emerald-100 rounded text-[7px] flex items-center justify-center font-bold text-emerald-800">۳</div>
                  <div className="bg-emerald-100 rounded text-[7px] flex items-center justify-center font-bold text-emerald-800">۴</div>
                </div>
                <span className="text-[10px] text-slate-500">
                  چهار سند در یک برگه A4
                </span>
              </button>
            </div>
          </div>

          {/* If 2-in-1 is selected: Secondary Document Selector / Upload */}
          {settings.layoutMode === '2-in-1' && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  انتخاب سند دوم (مثلاً پشت کارت ملی)
                </span>
                {settings.secondaryPhoto && (
                  <button
                    onClick={() => updateSetting('secondaryPhoto', undefined)}
                    className="text-[10px] text-red-600 hover:underline cursor-pointer"
                  >
                    حذف سند دوم
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {settings.secondaryPhoto ? (
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-amber-300">
                    <img
                      src={settings.secondaryPhoto}
                      alt="سند دوم"
                      className="w-12 h-9 object-cover rounded border"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-slate-700 font-medium">سند دوم انتخاب شده</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600">
                    (در صورت عدم انتخاب، همین سند فعلی دو بار در صفحه تکرار می‌شود)
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => secondaryFileInputRef.current?.click()}
                  className="mr-auto px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>آپلود تصویر پشت کارت</span>
                </button>
                <input
                  ref={secondaryFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSecondaryUpload}
                  className="hidden"
                />
              </div>

              {/* Quick Pick from Scanned Photos */}
              {capturedPhotos.length > 1 && (
                <div className="pt-2 border-t border-amber-200/80">
                  <span className="text-[10px] text-amber-800 block mb-1">یا انتخاب از اسکن‌های اخیر:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {capturedPhotos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => updateSetting('secondaryPhoto', photo.photocopyUrl || photo.dataUrl)}
                        className="p-0.5 rounded border border-slate-300 hover:border-emerald-500 bg-white shrink-0 cursor-pointer"
                        title={`سند شماره ${idx + 1}`}
                      >
                        <img
                          src={photo.photocopyUrl || photo.dataUrl}
                          alt="عکس قبلی"
                          className="w-10 h-7 object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Margins & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            {/* Orientation */}
            <div>
              <label className="font-bold text-slate-800 mb-1.5 block">جهت کاغذ (Orientation)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateSetting('orientation', 'portrait')}
                  className={`py-2 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-medium ${
                    settings.orientation === 'portrait'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  عمودی (Portrait)
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('orientation', 'landscape')}
                  className={`py-2 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-medium ${
                    settings.orientation === 'landscape'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  افقی (Landscape)
                </button>
              </div>
            </div>

            {/* Margin Mode */}
            <div>
              <label className="font-bold text-slate-800 mb-1.5 block">حاشیه کاغذ (Margins)</label>
              <div className="grid grid-cols-3 gap-1">
                {(['standard', 'compact', 'none'] as MarginMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateSetting('margin', m)}
                    className={`py-2 px-1 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                      settings.margin === m
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {m === 'standard' ? 'استاندارد' : m === 'compact' ? 'باریک' : 'لبه‌به‌لبه'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Print Options Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.addCutLine}
                onChange={(e) => updateSetting('addCutLine', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-800">
                  درج خط‌چین راهنمای تا و برش بین اسناد (در حالت ۲ در ۱ و ۴ در ۱)
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.addTimestampFooter}
                onChange={(e) => updateSetting('addTimestampFooter', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-800">
                  درج تاریخ شمسی و شناسه قطع در پاورقی برگه چاپ
                </span>
              </div>
            </label>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            چیدمان: <b>{PAPER_DIMENSIONS[settings.pageSize].nameFa.split(' ')[1]}</b> • {settings.layoutMode === '2-in-1' ? 'دو سند در یک برگ' : settings.layoutMode === '4-in-1' ? '۴ سند در برگ' : 'تک‌سند'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            تأیید و اعمال تنظیمات
          </button>
        </div>

      </div>
    </div>
  );
};
