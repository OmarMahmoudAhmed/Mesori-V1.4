/*
 * =====================================================
 * OnboardingPage.jsx - شاشة أول استخدام
 * =====================================================
 * تظهر مرة واحدة بس: بعد تسجيل حساب جديد وقبل الدخول لـ HomePage،
 * طالما userProfile.onboardingCompleted لسه false (راجع App.jsx).
 * يختار المستخدم اسمه وعمره وشخصيته، وتُحفظ في Supabase (profiles)
 * عبر completeOnboarding() من AppContext، فما تتكررش تاني بعد كده.
 * =====================================================
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import boyAvatar  from '../components/shared/Character1_Pic.png';
import girlAvatar from '../components/shared/Character2_Pic.png';

const CHARACTERS = [
  { id: 'boy',  label: 'ولد', avatar: boyAvatar },
  { id: 'girl', label: 'بنت', avatar: girlAvatar },
];

function OnboardingPage() {
  const { session, completeOnboarding } = useApp();

  const [name, setName] = useState(session?.user?.user_metadata?.name || '');
  const [age, setAge] = useState('');
  const [character, setCharacter] = useState('boy');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const ageNum = parseInt(age, 10);

    if (!trimmedName) {
      setError('من فضلك اكتب اسمك');
      return;
    }
    if (!age || isNaN(ageNum) || ageNum < 5 || ageNum > 18) {
      setError('من فضلك اكتب عمر صحيح (بين 5 و18 سنة)');
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await completeOnboarding(trimmedName, ageNum, character);
    setSubmitting(false);

    if (submitError) {
      setError('حصلت مشكلة في الحفظ، حاول تاني');
      console.error('❌ فشل حفظ بيانات Onboarding:', submitError);
    }
    // لو نجح: userProfile.onboardingCompleted بقت true تلقائياً،
    // وApp.jsx هينقل المستخدم لـ HomePage من غير أي navigate يدوي هنا
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10"
      style={{ backgroundColor: '#0F2D18', fontFamily: "'Cairo', sans-serif" }}
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏺</div>
          <h1 className="text-2xl font-black mb-2" style={{ color: '#F4E2BC' }}>
            أهلاً بيك في ميسوري!
          </h1>
          <p className="text-sm" style={{ color: '#C8922A' }}>
            قبل ما نبدأ رحلتك في مصر القديمة، عايزين نعرفك أكتر
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-6"
          style={{ backgroundColor: '#FDF3E3', border: '1px solid rgba(200,146,42,0.25)' }}
        >
          {/* اختيار الشخصية */}
          <div className="mb-5">
            <label className="block font-bold text-sm mb-3" style={{ color: '#3D2B1F' }}>
              اختار شخصيتك
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CHARACTERS.map((c) => {
                const isSelected = character === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCharacter(c.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl press-effect no-tap-highlight"
                    style={{
                      backgroundColor: isSelected ? 'rgba(45,106,63,0.12)' : 'transparent',
                      border: `2px solid ${isSelected ? '#2D6A3F' : 'rgba(200,146,42,0.25)'}`,
                    }}
                  >
                    <img src={c.avatar} alt={c.label} className="w-16 h-16 object-contain rounded-full" />
                    <span
                      className="font-bold text-sm"
                      style={{ color: isSelected ? '#2D6A3F' : '#8B5A2B' }}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* الاسم */}
          <div className="mb-4">
            <label className="block font-bold text-sm mb-2" style={{ color: '#3D2B1F' }}>
              اسمك
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(200,146,42,0.3)', color: '#3D2B1F' }}
            />
          </div>

          {/* العمر */}
          <div className="mb-5">
            <label className="block font-bold text-sm mb-2" style={{ color: '#3D2B1F' }}>
              عمرك
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="مثال: 10"
              min={5}
              max={18}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(200,146,42,0.3)', color: '#3D2B1F' }}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-center mb-4" style={{ color: '#DC2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-bold text-white press-effect no-tap-highlight"
            style={{ backgroundColor: submitting ? '#A9793F' : '#C8922A', fontFamily: "'Cairo', sans-serif" }}
          >
            {submitting ? 'جاري الحفظ...' : 'ابدأ المغامرة 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingPage;
