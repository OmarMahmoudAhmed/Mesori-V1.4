/*
 * =====================================================
 * VsComingSoonPage.jsx - نمط "1 ضد 1" (قريباً)
 * =====================================================
 * بناء نظام 1v1 كامل (مباريات حقيقية، مطابقة لاعبين، لعب حي)
 * خطوة قادمة منفصلة موثّقة في VS_MODE_GUIDE.md وتحتاج جداول
 * وبنية جديدة بالكامل. هذه الصفحة مجرد بوابة/إعلان الآن، ووِجهة
 * حقيقية لأيقونة ⚔️ في الصفحة الرئيسية بدل ما متوديش لحتة.
 * =====================================================
 */

import React from 'react';
import AppWrapper from '../components/layout/AppWrapper';
import Header      from '../components/layout/Header';
import BottomNav   from '../components/layout/BottomNav';

function VsComingSoonPage() {
  return (
    <AppWrapper>
      <Header showBack={true} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="text-6xl mb-4">⚔️</div>
        <h1
          className="text-xl font-black mb-2"
          style={{ fontFamily: "'Cairo', sans-serif", color: '#3D2B1F' }}
        >
          نمط 1 ضد 1 قريباً!
        </h1>
        <p
          className="text-sm max-w-xs"
          style={{ fontFamily: "'Cairo', sans-serif", color: '#8B5A2B' }}
        >
          هتقدر قريباً تتحدّى أصدقاءك في مسابقة معلومات مباشرة عن مصر القديمة. تابعنا عشان تعرف أول ما يُطلق!
        </p>
      </main>

      <BottomNav activePage="home" />
    </AppWrapper>
  );
}

export default VsComingSoonPage;
