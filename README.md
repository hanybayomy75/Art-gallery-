# 🎨 منصة معرض الفنون (Art Gallery Platform)

منصة عربية متكاملة واحترافية لعرض ونشر الأعمال الفنية، اللوحات، الرسومات الرقمية، والصور الفوتوغرافية، مبنية بتقنيات حديثة وسريعة ودعم كامل للغة العربية والاتجاه من اليمين إلى اليسار (RTL).

---

## 🌟 الميزات الأساسية

1. **تصميم فني أنيق ومتجاوب (Mobile First):** يدعم الهواتف، التابلت، وأجهزة الكمبيوتر مع أنظمة تخصيص المظهر (كلاسيكي، عصري، داكن فني، ألوان مائية، معرض أبيض).
2. **تسجيل الدخول والتراخيص:** دعم Google Auth, Facebook Auth, والبريد الإلكتروني مع كلمة المرور ببروتوكولات أمان Firebase.
3. **رفع وتخزين الصور:** ربط مباشر مع Cloudinary لحفظ وتصغير وتحسين جودة الصور أوتوماتيكيًا دون الكشف عن أي مفاتيح سرية.
4. **نظام اعتماد ومراجعة اللوحات:**
   - حالة `pending` للأعمال الجديدة.
   - مراجعة وقبول أو رفض العمل من قبل المالك/المشرف مع توضيح سبب الرفض.
   - نشر الأعمال المعتمدة فقط `approved` في الجاليري العام.
5. **نظام الإعجابات والتعليقات:** تفاعل آمن في الوقت الفعلي يمنع التكرار ويسمح بحذف التعليقات المخالفة.
6. **معاينة مشاركة وسائل التواصل الاجتماعي (Open Graph SSR):** توليد معاينات ذكية ديناميكية تظهر صورة العمل الفني بـ 1200x630 بدقة عالية عند المشاركة عبر Facebook, WhatsApp, X (Twitter), Telegram.
7. **نظام الصلاحيات (Owner / Admin / User):**
   - **Owner (المالك):** إضافة وإزالة المشرفين، التحكم الإداري الشامل، حماية الحساب من الحذف أو التعديل.
   - **Admin (المشرف):** مراجعة الأعمال، القبول والرفض، تمييز الأعمال المميزة، حذف التعليقات المخالفة.
   - **User (المستخدم):** رفع الأعمال، متابعة حالتها في "أعمالي"، الإعجاب والتعليق.

---

## 🛠️ دليل الإعداد والتشغيل والرفع

### 1. إضافة بيانات Firebase
- تم ربط المشروع بـ Firebase Firestore و Firebase Authentication تلقائيًا من خلال ملف `firebase-applet-config.json`.
- يمكنك تعديل أو إضافة بيانات المشروع في `.env.example` أو متغيرات البيئة بـ Vercel:
  ```env
  VITE_FIREBASE_PROJECT_ID="hidef-diorama-d77bw"
  ```

---

### 2. كيفية تفعيل Google Login
1. انتقل إلى [Firebase Console](https://console.firebase.google.com/).
2. اختر مشروعك ثم توجه إلى **Authentication** -> **Sign-in method**.
3. انقر على **Google** واختر **Enable**.
4. اختر بريد الدعم الخاص بالمشروع واضغط **Save**.

---

### 3. كيفية تفعيل Facebook Login
1. توجه إلى [Developers Facebook](https://developers.facebook.com/) وأنشئ تطبيقًا جديدًا.
2. احصل على **App ID** و **App Secret**.
3. في [Firebase Console](https://console.firebase.google.com/) -> **Authentication** -> **Sign-in method**:
   - اختر **Facebook** ثم **Enable**.
   - أدخل **App ID** و **App Secret**.
   - انسخ رابط **OAuth Redirect URI** الموفر من Firebase وضعه داخل إعدادات تطبيق Facebook في خانة **Valid OAuth Redirect URIs**.

---

### 4. كيفية إنشاء أول حساب
1. افتح الموقع واضغط على زر **تسجيل الدخول**.
2. يمكنك استخدام بريد Google أو إنشاء حساب جديد بالبريد الإلكتروني وكلمة المرور.

---

### 5. كيفية تحديد الحساب الأول كمالك (Owner)
- الحساب الذي بريده الإلكتروني يتطابق مع البريد المحدد في النظام (`SYSTEM_OWNER_EMAIL` في `src/lib/firebase.ts`) سيحصل تلقائيًا على دور **مالك الموقع (Owner)** عند تسجيل دخوله لأول مرة.
- الافتراضي المعتمد للمالك: `hany.bayomy75@gmail.com`.
- يمكنك تعديل هذا البريد من داخل `src/lib/firebase.ts`.

---

### 6. كيفية إضافة المشرفين (Admins)
1. سجل الدخول بحساب **المالك (Owner)**.
2. توجه إلى **لوحة الإدارة** من القائمة العلويّة.
3. اختر تبويب **إدارة المشرفين والمستخدمين**.
4. أدخل البريد الإلكتروني للمستخدم المسجل واضغط **منح صلاحية مشرف**.

---

### 7. كيفية إعداد Cloudinary
- تم إعداد حساب Cloudinary بالبيانات التالية:
  - **Cloud Name:** `fdl4gjvt`
  - **Upload Preset:** `gallery_upload` (Unsigned)
- للتعديل أو إنشاء Upload Preset جديد:
  1. ادخل إلى حسابك في [Cloudinary Dashboard](https://cloudinary.com/).
  2. اذهب إلى **Settings** -> **Upload** -> **Upload presets**.
  3. اضغط **Add upload preset** واجعل نوعه **Unsigned**.
  4. سمِّ الـ Preset باسم `gallery_upload`.

---

### 8. كيفية تشغيل المشروع محليًا
1. تأكد من تثبيت Node.js (النسخة 18+).
2. قم بتثبيت الحزم:
   ```bash
   npm install
   ```
3. شغل خادم التطوير:
   ```bash
   npm run dev
   ```
4. افتح المتصفح على: `http://localhost:3000`

---

### 9. كيفية نشر الموقع على Vercel
1. ارفع الكود على حسابك في GitHub.
2. ادخل إلى [Vercel](https://vercel.com/) واضغط **Add New Project**.
3. اختر المستودع الخاص بك.
4. في قسم **Environment Variables** أضف المتغيرات التالية:
   - `VITE_CLOUDINARY_CLOUD_NAME` = `fdl4gjvt`
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = `gallery_upload`
5. اضغط **Deploy**.

---

### 10. كيفية اختبار ظهور صورة العمل عند مشاركته على وسائل التواصل
عند مشاركة رابط أي عمل فريد مثل `https://your-domain.com/art/ARTWORK_ID`:

1. **Facebook:** استخدم أداة [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) وأدخل رابط العمل واضغط **Scrape Again** للاختبار.
2. **X (Twitter):** استخدم أداة [Twitter Card Validator](https://cards-dev.twitter.com/validator).
3. **WhatsApp & Telegram:** قم بإرسال رابط العمل مباشرة في محادثة وسيظهر مربع المعاينة متضمنًا صورة اللوحة، عنوان العمل، اسم الفنان، واسم معرض الفنون.
