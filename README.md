# ইজিদোকান — React Native (Expo) + NativeWind, সম্পূর্ণ অফলাইন

আপনার Next.js + NestJS + PostgreSQL অ্যাপের হুবহু Android version। **সার্ভার/ইন্টারনেট লাগে না** — সব ডাটা ফোনের ভেতরের SQLite-এ থাকে।

## Android Studio দিয়ে APK বানানো (এক কথায়)

দরকার: Node.js 20+, JDK 17, Android Studio (SDK + platform-tools ইনস্টল করা)।

```bash
npm install
npm test                 # ১৯টি হিসাব-পরীক্ষা (বিক্রি, বাকি, ফেরত, মেয়াদ/FEFO, ব্যাকআপ...)
npx expo prebuild --platform android      # android/ ফোল্ডার তৈরি
cd android && ./gradlew assembleRelease   # APK: android/app/build/outputs/apk/release/app-release.apk
```

- **সরাসরি ফোনে চালিয়ে দেখতে:** ফোন USB-তে লাগান (USB debugging চালু) → `npx expo run:android --variant release`
- **Android Studio-তে খুলতে:** `prebuild`-এর পর `android/` ফোল্ডারটা Android Studio-তে Open করুন → Build > Build APK(s)
- প্রথমবার Gradle ডাউনলোডের জন্য ইন্টারনেট লাগবে; অ্যাপ চালাতে লাগবে না।

### সাইজ কম রাখা হয়েছে
শুধু arm64 (আজকের প্রায় সব ফোন), R8 minify + resource shrink, Hermes, অপ্রয়োজনীয় permission বাদ (শুধু ক্যামেরা — বারকোডের জন্য)। পুরনো 32-bit ফোনের জন্য লাগলে `plugins/withSlimApk.js`-এ `arm64-v8a` এর সাথে `armeabi-v7a` যোগ করুন।

### Play Store-এ দিতে চাইলে
`./gradlew bundleRelease` (AAB) এবং নিজের keystore দিয়ে sign করতে হবে — https://docs.expo.dev/guides/local-app-production/

## ডাটা নিরাপত্তা
সব হিসাব শুধু এই ফোনে। **ফোন হারালে ব্যাকআপ ছাড়া ফেরত আসবে না।** তাই: ⊕ → *সেটিং / ব্যাকআপ* → "ব্যাকআপ নিন" করে ফাইলটা WhatsApp/Drive-এ রাখুন। নতুন ফোনে: নতুন দোকান খুলুন স্ক্রিনে "ব্যাকআপ ফাইল থেকে ফিরিয়ে আনুন"।

## পুরনো অ্যাপ থেকে যা বদলেছে
| আগে | এখন |
|---|---|
| PostgreSQL + NestJS + GraphQL + JWT | ফোনের SQLite + `src/services/*` (একই business logic) |
| একাধিক দোকান (tenant) | প্রতি ফোনে একটি দোকান |
| bcrypt password | SHA-256 (salted, ৩০০ রাউন্ড) |
| HTML `<select>`, `<input type=month>` | নিজস্ব বাছাই-শীট, মেয়াদ `MM/YYYY` |
| ক্যামেরা: ZXing (ব্রাউজার) | expo-camera (নেটিভ, দ্রুত) |

## ফোল্ডার
`src/services/` ব্যবসার হিসাব · `src/db/` SQLite · `src/app/` স্ক্রিন · `src/components/ui.tsx` ডিজাইন কিট · `tailwind.config.js` রঙ · `tests/` পরীক্ষা
