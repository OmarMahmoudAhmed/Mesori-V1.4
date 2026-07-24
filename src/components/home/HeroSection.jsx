/*
 * =====================================================
 * HeroSection.jsx - قسم الترحيب (Hero) في الصفحة الرئيسية
 * =====================================================
 *
 * تم التعديل لإضافة:
 * - شعار يطفو بحركة سلسة (float animation)
 * - عنوان إنجليزي بتدرج ذهبي لامع ومتحرك (shimmer)
 * - شارة الاسم العربي بخط جديد ونبضة خفيفة
 * - استبدال الخطوط بأخرى أكثر أناقة وحيوية
 * =====================================================
 */

import React from 'react';
import logoImage from '../shared/EgyptianLogo.png';
import ExplorerCharacter from '../shared/ExplorerCharacter';
import { useApp } from '../../context/AppContext';

function HeroSection() {
  const { userProfile } = useApp();

  return (
    <>
      {/*
        * تعريف الخطوط من Google Fonts والحركات CSS
        * داخل المكون نفسه لضمان التحميل
        */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Reem+Kufi:wght@700&display=swap');

        /* طفو اللوجو */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        /* وميض ذهبي للعنوان */
        @keyframes shimmer {
          to { background-position: 200% center; }
        }

        /* نبضة خفيفة للشارة العربية */
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            #C8922A 0%,
            #F5D061 25%,
            #FFE484 50%,
            #F5D061 75%,
            #C8922A 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: 42px;
          letter-spacing: 2px;
          line-height: 1.1;
          text-shadow: none; /* نتخلص من ظل النص السابق ليظهر التدرج نقيًا */
        }

        .arabic-badge-text {
          font-family: 'Reem Kufi', sans-serif;
          font-weight: 700;
          font-size: 1.25rem; /* يكافئ text-xl */
          animation: gentlePulse 2.5s ease-in-out infinite;
        }
      `}</style>

      <section className="pt-2 pb-6 px-5 animate-fade-in-up">

        {/* ===== الشعار الفرعوني مع حركة الطفو ===== */}
        <div className="flex justify-center mb-3">
          <div className="animate-float">
            <img
              src={logoImage}
              alt="شعار ميسوري"
              width={155}
              height={155}
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* ===== اسم التطبيق ===== */}
        {/* الاسم بالإنجليزية مع تأثير التدرج اللامع */}
        <h1 className="text-center mb-1 shimmer-text">
          Mesori
        </h1>

        {/* الاسم بالعربية داخل شارة بنية مع نبض خفيف */}
        <div className="flex justify-center mt-1 mb-3">
          <div
            className="px-5 py-1.5 rounded-full"
            style={{ backgroundColor: '#3D2B1F' }}
          >
            <span
              className="arabic-badge-text"
              style={{ color: '#C8922A' }}
            >
              ميسوري
            </span>
          </div>
        </div>

        {/* ===== صف النص والشخصية ===== (بدون تغيير) */}
        <div className="flex items-end justify-between gap-2">

          {/* النص الترحيبي */}
          <div
            className="flex-1 rounded-2xl p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.7)',
              border:          '1.5px solid rgba(200,146,42,0.25)',
              backdropFilter:  'blur(4px)',
            }}
          >
            <div className="flex gap-1 mb-1.5">
              <span style={{ color: '#C8922A', fontSize: '14px' }}>✦</span>
              <span style={{ color: '#C8922A', fontSize: '10px', marginTop:'2px' }}>✦</span>
            </div>

            <p
              className="font-semibold leading-relaxed"
              style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize:   '14px',
                color:      '#3D2B1F',
                lineHeight: '1.6',
              }}
            >
              مرحباً بك في ميسوري
              <br />
              <span style={{ color: '#8B4513', fontWeight: 700 }}>
                اختر معرفتك
              </span>
              {' '}بالتاريخ المصري القديم!
            </p>
          </div>

          {/* شخصية المستكشف */}
          <div className="flex-shrink-0" style={{ marginBottom: '-8px' }}>
            <ExplorerCharacter
              size={100}
              gender={userProfile.character}
            />
          </div>

        </div>

      </section>
    </>
  );
}

export default HeroSection;