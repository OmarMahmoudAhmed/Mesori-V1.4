/*
 * =====================================================
 * AppContext.jsx - قلب التطبيق وذاكرته المشتركة
 * =====================================================
 *
 * ما هو React Context؟
 * تخيّل Context كـ "إذاعة" داخل التطبيق:
 * - AppProvider = محطة البث (تُرسل البيانات)
 * - useApp()    = راديو (أي مكوّن يريد الاستماع)
 *
 * خارطة البيانات المُدارة هنا:
 * ┌─────────────────────────────────────────┐
 * │  session       → جلسة Supabase Auth الحالية│
 * │  userProfile   → بيانات المستخدم (من profiles)│
 * │  levelsData    → تقدّم المستويات/المراحل│
 * │  completeStage()→ إنهاء مرحلة + فتح التالية│
 * │  signUp/signIn/signOut/completeOnboarding│
 * │  isSoundOn     → حالة الصوت            │
 * │  currentPage   → الصفحة الحالية        │
 * │  pageData      → بيانات الصفحة         │
 * │  navigateTo()  → دالة التنقل           │
 * │  goBack()      → دالة الرجوع           │
 * │  progressPct   → نسبة التقدم الكلي     │
 * └─────────────────────────────────────────┘
 *
 * تسلسل التحميل عند فتح التطبيق:
 * 1) authLoading: فحص هل فيه جلسة دخول محفوظة (Supabase يحفظها محلياً)
 * 2) لو فيه جلسة: profileLoading يجيب صف profiles + رتبة المستخدم
 * 3) بالتوازي (بلا انتظار الجلسة): تحميل levels/stages/questions
 *    (محتوى عام، متاح للجميع بلا تسجيل دخول)
 * 4) بمجرد ما (2) و(3) يخلصوا الاثنين: تُطبَّق مراحل المستخدم
 *    المكتملة سابقاً (user_progress) فوق بنية المحتوى، فتظهر
 *    المراحل المفتوحة/المكتملة صح من أول ثانية بعد تسجيل الدخول
 * =====================================================
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { levelsData as initialLevelsData } from '../data/levels';
import { supabase } from '../lib/supabaseClient';

/*
 * تُعيد حساب حالة "مفتوحة/مقفولة" لكل مستوى ومرحلة من الصفر بناءً
 * على isCompleted فقط (مصدر الحقيقة الوحيد). تُستخدم في مكانين:
 * حساب أولي عند تحميل تقدّم قديم من user_progress، وبعد كل
 * completeStage() (بدل منطق فتح يدوي مبعثر في كل مكان).
 */
function computeUnlockedLevels(levelsWithCompletion) {
  return levelsWithCompletion.map((level, levelIdx) => {
    const prevLevel = levelIdx > 0 ? levelsWithCompletion[levelIdx - 1] : null;
    const levelUnlocked = levelIdx === 0 || (prevLevel ? prevLevel.stages.every(s => s.isCompleted) : false);

    const stages = level.stages.map((stage, stageIdx) => ({
      ...stage,
      isUnlocked: stageIdx === 0 ? levelUnlocked : level.stages[stageIdx - 1].isCompleted,
    }));

    return {
      ...level,
      isUnlocked: levelUnlocked,
      stages,
      earnedPoints: stages.reduce((sum, s) => sum + s.earnedPoints, 0),
    };
  });
}

/* تطبّق صفوف user_progress (من قاعدة البيانات) فوق بنية المحتوى */
function applyProgressOverlay(levels, progressRows) {
  const progressMap = new Map(progressRows.map(p => [`${p.level_id}-${p.stage_id}`, p]));
  const withCompletion = levels.map(level => ({
    ...level,
    stages: level.stages.map(stage => {
      const p = progressMap.get(`${level.id}-${stage.id}`);
      return { ...stage, isCompleted: p?.is_completed ?? false, earnedPoints: p?.best_score ?? 0 };
    }),
  }));
  return computeUnlockedLevels(withCompletion);
}

const AppContext = createContext(null);

export function AppProvider({ children }) {

  // ---- حالة الصوت ----
  const [isSoundOn, setIsSoundOn] = useState(true);

  // ---- جلسة Supabase Auth ----
  const [session,      setSession]      = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);  // فحص الجلسة المحفوظة عند فتح التطبيق
  const [profileLoading, setProfileLoading] = useState(true);
  const [contentLoaded,  setContentLoaded]  = useState(false); // هل levels/stages اتحمّلوا من Supabase؟

  // ---- بيانات المستخدم (تُملأ فعلياً من profiles بعد تسجيل الدخول) ----
  const [userProfile, setUserProfile] = useState({
    id:                  null,
    name:                'مكتشف',
    age:                 null,
    country:             'مصر',
    countryFlag:         '🇪🇬',
    character:           'boy',
    currentLevel:        1,
    completedStages:     0,
    totalPoints:         0,
    rank:                null,
    onboardingCompleted: false,
  });

  // ---- حالة المستويات والمراحل ----
  const [levels, setLevels] = useState(initialLevelsData);

  // ---- نظام التنقل ----
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData,    setPageData]    = useState(null);
  const [navHistory, setNavHistory] = useState(['home']);

  // =============================================
  // إدارة جلسة الدخول (Supabase Auth)
  // =============================================
  useEffect(() => {
    // 1) فحص هل فيه جلسة محفوظة من زيارة سابقة (Supabase بيحفظها في localStorage تلقائياً)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (!session) setProfileLoading(false); // مفيش جلسة = مفيش بروفايل ننتظره
    });

    // 2) الاستماع لأي تغيير لاحق (تسجيل دخول/خروج/تجديد الجلسة تلقائياً)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // تسجيل خروج: رجّع البروفايل لحالة فارغة آمنة (الصفحة هترجع لـ Login فوراً)
        setProfileLoading(true);
        setUserProfile(prev => ({ ...prev, id: null, onboardingCompleted: false }));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // =============================================
  // تحميل بيانات البروفايل + الترتيب بعد تسجيل الدخول
  // =============================================
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          // أول تسجيل قد يسبق الـ trigger بجزء من الثانية في حالات نادرة
          console.error('❌ خطأ في تحميل البروفايل:', error);
          return;
        }

        // الترتيب اختياري (يظهر بس لو المستخدم دخل الـ leaderboard، أي بعد onboarding)
        let rank = null;
        if (data.onboarding_completed) {
          const { data: rankRow } = await supabase
            .from('leaderboard')
            .select('rank')
            .eq('id', session.user.id)
            .maybeSingle();
          rank = rankRow?.rank ?? null;
        }

        setUserProfile(prev => ({
          ...prev,
          id:                  data.id,
          name:                data.username,
          age:                 data.age,
          country:             data.country || 'مصر',
          countryFlag:         data.country_flag || '🇪🇬',
          character:           data.character,
          totalPoints:         data.total_points,
          onboardingCompleted: data.onboarding_completed,
          rank,
        }));
      } catch (err) {
        console.error('❌ خطأ غير متوقع في تحميل البروفايل:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [session?.user?.id]);

  // =============================================
  // تحميل المستويات والمراحل من Supabase
  // =============================================
  /*
   * الألوان ومسارات الأيقونات بصرية بحتة ولا تحتاج تخزينها في
   * قاعدة البيانات (نفس القرار الموثّق في BACKEND_GUIDE.md)، لكنها
   * لازم تختلف فعلياً حسب كل مستوى (سهل=أخضر، متوسط=فيروزي،
   * صعب=أزرق، صعب جداً=برتقالي/بني، متقدم=ذهبي) بدل قيمة واحدة
   * ثابتة لكل المستويات كما كانت — نفس القيم الأصلية من data/levels.js.
   */
  const LEVEL_PRESENTATION = {
    1: { iconSrc: '/assets/icons/levels/level-1-pyramid.png',        bgColor: '#1B5E2E', headerBg: '#143F20', textColor: '#4ADE80', iconBg: '#0F2D18', badgeBg: '#0F2D18', badgeText: '#86EFAC' },
    2: { iconSrc: '/assets/icons/levels/level-2-pharaoh-mask.png',   bgColor: '#0D7E72', headerBg: '#085E54', textColor: '#34D399', iconBg: '#054540', badgeBg: '#054540', badgeText: '#6EE7B7' },
    3: { iconSrc: '/assets/icons/levels/level-3-pillar.png',         bgColor: '#1A3A6B', headerBg: '#122848', textColor: '#60A5FA', iconBg: '#0D1E3D', badgeBg: '#0D1E3D', badgeText: '#93C5FD' },
    4: { iconSrc: '/assets/icons/levels/level-4-pharaoh-figure.png', bgColor: '#3B1A08', headerBg: '#2A1206', textColor: '#FB923C', iconBg: '#1E0D04', badgeBg: '#1E0D04', badgeText: '#FDBA74' },
    5: { iconSrc: '/assets/icons/levels/level-5-ankh-shield.png',    bgColor: '#7A5200', headerBg: '#5A3C00', textColor: '#FBBF24', iconBg: '#3D2800', badgeBg: '#3D2800', badgeText: '#FCD34D' },
  };
  const FALLBACK_PRESENTATION = LEVEL_PRESENTATION[1];

  useEffect(() => {
    async function loadLevels() {
      try {
        console.log('🔄 تحميل المستويات والمراحل من Supabase...');

        // 1. جلب المستويات مع مراحلهم
        const { data: levelsData, error: levelsError } = await supabase
          .from('levels')
          .select(`
            id,
            name_ar,
            name_en,
            difficulty,
            max_points,
            stages: stages (
              id,
              level_id,
              title,
              description,
              order_index,
              emoji
            )
          `)
          .order('id');

        if (levelsError) {
          console.error('❌ خطأ في تحميل المستويات:', levelsError);
          return;
        }

        if (!levelsData || levelsData.length === 0) {
          console.warn('⚠️ لا توجد بيانات مستويات في قاعدة البيانات. استخدم البيانات الثابتة.');
          return;
        }

        // 2. تحويل البيانات إلى الشكل المتوقع من المكونات
        const formattedLevels = levelsData.map(level => {
          // ترتيب المراحل حسب order_index
          const LEVEL_NAMES_AR = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس' };
          const stages = (level.stages || [])
            .sort((a, b) => a.order_index - b.order_index)
            .map(stage => ({
              id: stage.id,
              levelId: stage.level_id,
              title: stage.title,
              description: stage.description || '',
              emoji: stage.emoji || '📚',
              // حالة المرحلة (مقفولة/مفتوحة/مكتملة) سنحددها لاحقاً
              isUnlocked: false,
              isCompleted: false,
              earnedPoints: 0,
              // نص فتح المرحلة (يظهر بدل الوصف طالما لسه مقفولة):
              // المرحلة 1 من أي مستوى تحتاج إكمال المستوى السابق،
              // وأي مرحلة تانية تحتاج إكمال المرحلة اللي قبلها فقط
              unlockCondition: stage.id === 1
                ? `أكمل المستوى ${LEVEL_NAMES_AR[level.id - 1] || 'السابق'} لفتح هذا المستوى`
                : `أكمل المرحلة ${stage.id - 1} لفتح هذه المرحلة`,
            }));

          return {
            id: level.id,
            nameAr: level.name_ar,
            nameEn: level.name_en || `Level ${level.id}`,
            difficulty: level.difficulty,
            maxPoints: level.max_points || 100,
            totalStages: stages.length,
            isUnlocked: level.id === 1, // المستوى الأول مفتوح دائماً
            earnedPoints: 0,
            stages: stages,
            // خصائص إضافية للتنسيق (لن تُستخدم في قاعدة البيانات) —
            // تختلف فعلياً حسب كل مستوى، راجع LEVEL_PRESENTATION أعلاه
            ...(LEVEL_PRESENTATION[level.id] || FALLBACK_PRESENTATION),
            quizCount: 10,
          };
        });

        // 3. فتح المرحلة الأولى من المستوى الأول
        if (formattedLevels.length > 0 && formattedLevels[0].stages.length > 0) {
          formattedLevels[0].stages[0].isUnlocked = true;
        }

        console.log(`✅ تم تحميل ${formattedLevels.length} مستويات و ${formattedLevels.reduce((acc, l) => acc + l.stages.length, 0)} مراحل.`);
        setLevels(formattedLevels);
        setContentLoaded(true);

      } catch (error) {
        console.error('❌ خطأ غير متوقع في تحميل المستويات:', error);
      }
    }

    loadLevels();
  }, []); // [] = يتم التنفيذ مرة واحدة فقط عند تحميل المكون

  // =============================================
  // تطبيق تقدّم المستخدم السابق (user_progress) فوق المحتوى
  // =============================================
  /*
   * لازم ننتظر الاثنين معاً: المحتوى (levels/stages) والمستخدم
   * (session)، وإلا لو طبّقنا التقدّم على البيانات الثابتة المؤقتة
   * (initialLevelsData) قبل ما يوصل محتوى Supabase الحقيقي، هيجي
   * setLevels(formattedLevels) بعدها ويمسح التقدّم اللي طبّقناه.
   */
  useEffect(() => {
    if (!contentLoaded || !session?.user?.id) return;

    async function loadProgress() {
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('level_id, stage_id, is_completed, best_score')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('❌ خطأ في تحميل التقدّم السابق:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log(`✅ تطبيق ${data.length} مرحلة مكتملة سابقاً.`);
          setLevels(prev => applyProgressOverlay(prev, data));
        }
      } catch (err) {
        console.error('❌ خطأ غير متوقع في تحميل التقدّم:', err);
      }
    }

    loadProgress();
  }, [contentLoaded, session?.user?.id]);

  // =============================================
  // الدوال (Functions)
  // =============================================

  const toggleSound = useCallback(() => {
    setIsSoundOn(prev => !prev);
  }, []);

  const navigateTo = useCallback((page, data = null) => {
    setNavHistory(prev => [...prev, page]);
    setCurrentPage(page);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const goBack = useCallback(() => {
    setNavHistory(prev => {
      if (prev.length > 1) {
        const newHistory = [...prev];
        newHistory.pop();
        const prevPage = newHistory[newHistory.length - 1];
        setCurrentPage(prevPage);
        setPageData(null);
        window.scrollTo({ top: 0, behavior: 'instant' });
        return newHistory;
      }
      return prev;
    });
  }, []);

  const updateUserProfile = useCallback((updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const addPoints = useCallback((points) => {
    setUserProfile(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + points
    }));
  }, []);

  // =============================================
  // دوال المصادقة (Supabase Auth)
  // =============================================
  /*
   * كل دالة بترجع { error } بس (null لو نجحت) — صفحة تسجيل
   * الدخول/الحساب هي المسؤولة عن عرض رسالة الخطأ للمستخدم.
   * الملف الشخصي بيتعمل تلقائياً (Trigger في قاعدة البيانات) بمجرد
   * نجاح signUp، فمفيش داعي نعمل INSERT يدوي هنا.
   */
  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    // لو الإعدادات في Supabase بتطلب تأكيد بريد إلكتروني، هترجع
    // user من غير session نشطة لحد ما يضغط رابط التأكيد
    const needsEmailConfirmation = !error && data?.user && !data?.session;
    return { error, needsEmailConfirmation };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /* تُستدعى من شاشة Onboarding بعد اختيار الاسم/العمر/الشخصية */
  const completeOnboarding = useCallback(async (name, age, character) => {
    if (!session?.user?.id) {
      return { error: new Error('لا يوجد مستخدم مسجّل دخول') };
    }
    const { error } = await supabase
      .from('profiles')
      .update({ username: name, age, character, onboarding_completed: true })
      .eq('id', session.user.id);

    if (!error) {
      setUserProfile(prev => ({ ...prev, name, age, character, onboardingCompleted: true }));
    }
    return { error };
  }, [session]);

  const completeStage = useCallback((levelId, stageId, earnedPoints) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return null;

    const stageIndex = level.stages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) return null;

    const stage = level.stages[stageIndex];
    const wasFirstCompletion = !stage.isCompleted;
    const bestPoints = Math.max(stage.earnedPoints, earnedPoints);
    const pointsDelta = bestPoints - stage.earnedPoints;

    // 1) علّم المرحلة كمكتملة، 2) أعد حساب كل حالات الفتح تلقائياً
    // من الإكمال (نفس الدالة المستخدمة عند تحميل تقدّم قديم) — بدل
    // منطق فتح يدوي منفصل يسهل إن يتعارض مع بعضه بمرور الوقت.
    const withCompletion = levels.map(lv => lv.id !== levelId ? lv : {
      ...lv,
      stages: lv.stages.map((s, idx) => idx !== stageIndex ? s : { ...s, isCompleted: true, earnedPoints: bestPoints }),
    });
    const newLevels = computeUnlockedLevels(withCompletion);
    setLevels(newLevels);

    const newLevel = newLevels.find(l => l.id === levelId);
    let nextStage = null;
    let justUnlockedLevelId = null;
    if (stageIndex + 1 < newLevel.stages.length && newLevel.stages[stageIndex + 1].isUnlocked) {
      nextStage = { levelId, stageId: newLevel.stages[stageIndex + 1].id };
    } else {
      const nextLevel = newLevels.find(l => l.id === levelId + 1);
      if (nextLevel && nextLevel.isUnlocked && nextLevel.stages.length > 0) {
        nextStage = { levelId: nextLevel.id, stageId: nextLevel.stages[0].id };
        if (wasFirstCompletion) justUnlockedLevelId = nextLevel.id;
      }
    }

    setUserProfile(prev => ({
      ...prev,
      totalPoints:     prev.totalPoints + pointsDelta,
      completedStages: wasFirstCompletion ? prev.completedStages + 1 : prev.completedStages,
      currentLevel:    justUnlockedLevelId
        ? Math.min(levels.length, Math.max(prev.currentLevel, justUnlockedLevelId))
        : prev.currentLevel,
    }));

    /*
     * مزامنة مع Supabase (RPC ذرّية تحدّث user_progress + النقاط
     * معاً — راجع supabase/migrations/002_auth_and_leaderboard.sql).
     * لا تحجب الواجهة: الحالة المحلية اتحدّثت فعلاً فوق، فلو المستخدم
     * مش مسجّل دخول (أو الشبكة فصلت لحظياً) اللعب يفضل شغّال، بس
     * التقدّم مش هيتحفظ لحد ما يرجع يتصل/يسجّل دخول.
     */
    if (session?.user?.id) {
      supabase
        .rpc('record_stage_progress', { p_level_id: levelId, p_stage_id: stageId, p_score: bestPoints })
        .then(({ error }) => {
          if (error) console.error('❌ فشل حفظ التقدّم في Supabase:', error);
        });
    }

    return { wasFirstCompletion, pointsDelta, nextStage, isLastStageOverall: !nextStage };
  }, [levels, session]);

  const MAX_TOTAL_POINTS  = 500;
  const progressPercentage = Math.min(
    100,
    Math.round((userProfile.totalPoints / MAX_TOTAL_POINTS) * 100)
  );

  const contextValue = {
    // مصادقة
    session,
    authLoading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    completeOnboarding,
    // بيانات المستخدم
    userProfile,
    updateUserProfile,
    addPoints,
    levelsData: levels,
    completeStage,
    isSoundOn,
    toggleSound,
    currentPage,
    pageData,
    navigateTo,
    goBack,
    navHistory,
    progressPercentage,
    MAX_TOTAL_POINTS,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      '❌ useApp() يجب استخدامه داخل <AppProvider> فقط!\n' +
      'راجع ملف App.jsx وتأكد أن المكوّن محاط بـ <AppProvider>'
    );
  }
  return context;
}