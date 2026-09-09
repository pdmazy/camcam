# دوربین فارسی (Persian Camera Android App)

اپلیکیشن اندروید سبک، مینیمال، کاملاً فارسی و راست‌چین (RTL) برای گرفتن عکس با دوربین گوشی و ذخیره مستقیم در گالری با قابلیت ساخت خودکار فایل نصبی (APK) توسط GitHub Actions.

---

## 🌟 قابلیت‌ها و ویژگی‌ها

- **فارسی و راست‌چین (RTL)**: تمام متن‌ها، استرینگ‌ها و چیدمان رابط کاربری به صورت راست‌چین طراحی شده‌اند.
- **سبک و بدون موارد اضافه**: کمترین حجم فایل نصبی، عملکرد فوق‌العاده سریع بدون هیچ وابستگی یا کتابخانه اضافه.
- **استفاده از Jetpack CameraX**: پشتیبانی پایدار از دوربین اکثر گوشی‌های اندرویدی (Android 7.0 تا Android 15).
- **ذخیره خودکار در گالری**: ذخیره در مسیر استاندارد `Pictures/PersianCamera` از طریق MediaStore Scoped Storage بدون ایجاد اختلال در دسترسی‌های اندروید ۱۰ و بالاتر.
- **تغییر دوربین جلو و پشت**: سوییچ آسان بین دوربین سلفی و دوربین اصلی.
- **انیمیشن شاتر و فیدبک بصری**: شبیه‌سازی افکت فلش هنگام ثبت عکس.
- **معماری ماژولار**: تفکیک لایه‌های مدیریت دوربین (`CameraManager`)، ذخیره‌سازی (`PhotoStorageManager`) و دسترسی‌ها (`PermissionUtils`).

---

## 🚀 ساخت خودکار فایل نصبی (APK) با گیت‌هاب اکشنز (GitHub Actions)

یک ورک‌فلو آماده در مسیر `.github/workflows/build-apk.yml` تعبیه شده است که به صورت کاملاً خودکار فایل نصبی APK را کامپایل و آماده دانلود می‌کند:

### مراحل دریافت فایل APK:

1. **ارسال پروژه به گیت‌هاب**:
   پروژه را در یک مخزن جدید در گیت‌هاب خود Push کنید:
   ```bash
   git add .
   git commit -m "Initial commit for Persian Camera app"
   git push origin main
   ```

2. **اجرای خودکار اکشن**:
   بلافاصله پس از Push، گیت‌هاب اکشنِ `Build Android APK` به طور خودکار اجرا می‌شود.
   (همچنین می‌توانید از تب **Actions** گزینه **Run workflow** را به صورت دستی بزنید).

3. **دانلود فایل نصبی**:
   - وارد تب **Actions** در مخزن گیت‌هاب خود شوید.
   - روی آخرین اجرای مربوط به بیلد کلیک کنید.
   - در انتهای صفحه در بخش **Artifacts**، فایل‌های:
     - `PersianCamera-Debug-APK`
     - `PersianCamera-Release-APK`
     را دانلود و روی گوشی خود نصب کنید.

---

## 📁 ساختار ماژولار پروژه

```
├── .github/workflows/
│   └── build-apk.yml             # ورک‌فلو کامپایل خودکار و خروجی APK در گیت‌هاب
├── app/
│   ├── build.gradle.kts          # کانفیگ ماژول اندروید و CameraX
│   └── src/main/
│       ├── AndroidManifest.xml   # تعاریف دسترسی دوربین و راست‌چین
│       ├── java/com/example/persiancamera/
│       │   ├── MainActivity.kt            # اکتیویتی اصلی و رابط کاربری
│       │   ├── camera/
│       │   │   └── CameraManager.kt       # مدیریت CameraX و ثبت عکس
│       │   ├── storage/
│       │   │   └── PhotoStorageManager.kt # ذخیره سازی MediaStore در گالری
│       │   └── util/
│       │       └── PermissionUtils.kt     # کنترل دسترسی دوربین
│       └── res/
│           ├── layout/activity_main.xml   # رابط کاربری اختصاصی راست‌چین
│           └── values/
│               ├── strings.xml            # استرینگ‌های فارسی
│               ├── colors.xml             # پالت رنگی تیره و چشم‌نواز
│               └── themes.xml             # استایل اپلیکیشن
├── build.gradle.kts              # تنظیمات اصلی گریدل پروژه
├── settings.gradle.kts           # تعاریف ریپازیتوری‌ها و ماژول‌ها
├── gradle.properties             # تنظیمات حافظه و AndroidX
└── gradlew / gradlew.bat         # اسکریپت‌های اجرای گریدل
```

---

## 💻 بیلد دستی در محیط لوکال (در صورت تمایل)

اگر Android Studio یا Gradle روی سیستم خود دارید:
```bash
./gradlew assembleDebug
```
فایل APK در مسیر زیر تولید می‌شود:
`app/build/outputs/apk/debug/app-debug.apk`
