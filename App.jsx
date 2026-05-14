import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import {
  BookOpen, Gamepad2, Lightbulb, CheckCircle2, XCircle,
  Settings, RotateCw, RotateCcw, Wrench, Scale, FileText, ChevronLeft, ChevronRight, FileDown,
  ArrowUp, ArrowDown, Hand, Lock, Sparkles, PartyPopper, Trophy
} from 'lucide-react';

/* =========================================
   闖關進度系統（5/15 新增）
   每節拆 1-N 個 part，每個 part 末端一題 mini-quiz，答對才能開下一段。
   全 11 關通過才開單元總測驗。localStorage 持久化。
   ========================================= */
const PARTS = ['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','4-1','4-2','4-3'];
const SECTION_PARTS = {
  lever:  ['1-1','1-2','1-3'],
  wheel:  ['2-1','2-2','2-3'],
  pulley: ['3-1','3-2'],
  gear:   ['4-1','4-2','4-3'],
};
const SECTION_LABEL = { lever: '第 1 節 槓桿', wheel: '第 2 節 輪軸', pulley: '第 3 節 滑輪', gear: '第 4 節 齒輪+綜合' };
const NEXT_SECTION = { '1-3': 'wheel', '2-3': 'pulley', '3-2': 'gear', '4-3': 'quiz' };
const STORAGE_KEY = 'sm_interactive_progress_v1';

const QUIZ = {
  '1-1': { q: '槓桿轉動時，固定不動的那個點叫做什麼？', opts: ['施力點', '抗力點', '支點'], a: 2, hint: '翹翹板中間那根棒子，是被什麼撐住不動？' },
  '1-2': { q: '「開瓶器」屬於哪一種槓桿？', opts: ['省力槓桿', '費力槓桿', '等臂槓桿'], a: 0, hint: '開瓶蓋很輕鬆，是因為施力臂比抗力臂長還是短？' },
  '1-3': { q: '抗力不變，把施力點往外移（施力臂變長），所需要的力會？', opts: ['變大', '變小', '不變'], a: 1, hint: '回上面實驗室拉看看，離支點越遠是不是越省力？' },
  '2-1': { q: '輪軸的「支點」位於哪裡？', opts: ['輪的邊緣', '軸的邊緣', '輪和軸的中心'], a: 2, hint: '想想看輪軸轉動時，哪一點不會移動？' },
  '2-2': { q: '螺絲起子粗的「把手」是輪、細的「金屬桿」是軸，我們用手轉把手是？', opts: ['施力在輪，省力', '施力在軸，費力', '施力在軸，省力'], a: 0, hint: '施力在大圓（輪半徑大）會省力還是費力？' },
  '2-3': { q: '同一個輪軸，「施力在輪」與「施力在軸」相比？', opts: ['施力在輪比較省力', '施力在軸比較省力', '兩個一樣'], a: 0, hint: '你剛剛拉哪一邊，需要的力比較小？' },
  '3-1': { q: '國旗升旗桿頂端的滑輪屬於哪一種？', opts: ['定滑輪', '動滑輪', '都可以'], a: 0, hint: '它有跟著國旗一起被拉上去嗎？' },
  '3-2': { q: '「動滑輪」能省一半的力，代價是什麼？', opts: ['拉繩子的距離要兩倍', '沒有代價', '不能改變方向（這不算代價）'], a: 0, hint: '在實驗室裡，動滑輪要拉多長的繩子物體才會上升一點？' },
  '4-1': { q: '兩個互相咬合的齒輪，轉動方向是？', opts: ['相同', '相反', '不一定'], a: 1, hint: '齒輪牙齒咬在一起，推一邊，另一邊會被推往哪？' },
  '4-2': { q: '大齒輪轉一圈，旁邊咬合的小齒輪會？', opts: ['也轉一圈', '轉超過一圈', '轉不到一圈'], a: 1, hint: '看一下實驗室裡綠色小齒輪的轉速比較快還是慢？' },
  '4-3': { q: '下面哪一句話最正確？', opts: ['機械可以同時省力又省距離', '機械可以省力，但要拉得更遠（功不變）', '機械不能省力'], a: 1, hint: '看一下上面「核心觀念—功不變」那一段' },
};

const ProgressContext = createContext(null);

function ProgressProvider({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked)); } catch {}
  }, [unlocked]);

  const markDone = (partId) => setUnlocked(u => ({ ...u, [partId]: true }));
  const reset = () => { setUnlocked({}); try { localStorage.removeItem(STORAGE_KEY); } catch {} };

  const totalDone = PARTS.filter(p => unlocked[p]).length;
  const percent = Math.round((totalDone / PARTS.length) * 100);

  const isSectionAccessible = (section) => {
    if (section === 'textbook' || section === 'lever') return true;
    const need = {
      wheel: SECTION_PARTS.lever,
      pulley: [...SECTION_PARTS.lever, ...SECTION_PARTS.wheel],
      gear: [...SECTION_PARTS.lever, ...SECTION_PARTS.wheel, ...SECTION_PARTS.pulley],
      quiz: PARTS,
    }[section] || [];
    return need.every(p => unlocked[p]);
  };

  return (
    <ProgressContext.Provider value={{ unlocked, markDone, reset, totalDone, percent, isSectionAccessible }}>
      {children}
    </ProgressContext.Provider>
  );
}

function TopProgressBar() {
  const { unlocked, totalDone, percent, reset } = useContext(ProgressContext);
  return (
    <div className="bg-white/95 backdrop-blur border-t border-blue-500/30 px-4 py-3">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Trophy className="w-4 h-4 text-amber-500" /> 學習進度
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-blue-600">{totalDone} / {PARTS.length}（{percent}%）</span>
            {totalDone > 0 && (
              <button onClick={() => { if (confirm('確定要重置學習進度嗎？')) reset(); }}
                className="text-xs text-slate-400 hover:text-red-500 underline">重置</button>
            )}
          </div>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 transition-all duration-700 rounded-full"
            style={{ width: `${percent}%` }} />
        </div>
        <div className="flex gap-1 mt-2">
          {PARTS.map(p => (
            <div key={p} title={`第 ${p} 關`}
              className={`flex-1 h-1.5 rounded-full transition-colors ${unlocked[p] ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartHeader({ number, title }) {
  return (
    <div className="mb-4 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-transparent px-4 py-2 rounded-lg border-l-4 border-blue-500">
      <span className="text-2xl font-black text-blue-600 tabular-nums">{number}</span>
      <h3 className="text-xl font-bold text-blue-900">{title}</h3>
    </div>
  );
}

function MiniQuiz({ partId, nextPartId }) {
  const { unlocked, markDone, isSectionAccessible } = useContext(ProgressContext);
  const done = !!unlocked[partId];
  const quiz = QUIZ[partId];
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const submit = (idx) => {
    if (feedback) return;
    setSelectedIdx(idx);
    if (idx === quiz.a) {
      setFeedback('correct');
      setTimeout(() => {
        markDone(partId);
        if (nextPartId) {
          setTimeout(() => {
            document.getElementById(`part-${nextPartId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 400);
        }
      }, 800);
    } else {
      setFeedback('wrong');
      setTimeout(() => { setSelectedIdx(null); setFeedback(null); }, 2200);
    }
  };

  if (done) {
    const nextSection = NEXT_SECTION[partId];
    return (
      <div className="mt-6 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-emerald-800 flex items-center gap-2">
              這一關通過囉！
              {nextSection && (
                <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  {nextSection === 'quiz' ? '🎉 全部完成！可以挑戰單元總測驗' : `已解鎖 ${SECTION_LABEL[nextSection]}`}
                </span>
              )}
            </div>
            <div className="text-sm text-emerald-700 mt-1">{quiz.q} → <strong>{quiz.opts[quiz.a]}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-5 rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-600" />
        <span className="font-bold text-amber-900">小檢查 {partId} — 答對才能解鎖下一段</span>
      </div>
      <h4 className="font-bold text-slate-800 mb-4 text-base md:text-lg">{quiz.q}</h4>
      <div className="space-y-2">
        {quiz.opts.map((opt, idx) => {
          const isSel = selectedIdx === idx;
          const showCorrect = feedback === 'correct' && isSel;
          const showWrong = feedback === 'wrong' && isSel;
          let cls = 'w-full text-left p-3 rounded-lg border-2 transition-all font-medium ';
          if (showCorrect) cls += 'border-green-500 bg-green-100 text-green-800';
          else if (showWrong) cls += 'border-red-500 bg-red-100 text-red-800';
          else if (!isSel && !feedback) cls += 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-slate-700';
          else cls += 'border-slate-200 bg-slate-50 text-slate-400';
          return (
            <button key={idx} onClick={() => submit(idx)} disabled={feedback !== null} className={cls}>
              <span className="inline-block w-6 font-black text-slate-500">{String.fromCharCode(65 + idx)}.</span>
              {opt}
              {showCorrect && <CheckCircle2 className="inline ml-2 w-5 h-5 text-green-600" />}
              {showWrong && <XCircle className="inline ml-2 w-5 h-5 text-red-600" />}
            </button>
          );
        })}
      </div>
      {feedback === 'wrong' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          ❌ 再看一下這一段內容，想想看再試試看！
          {quiz.hint && <span className="block mt-1 text-red-700">💡 提示：{quiz.hint}</span>}
        </div>
      )}
      {feedback === 'correct' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> 答對了！正在解鎖下一段⋯
        </div>
      )}
    </div>
  );
}

function LockedPlaceholder({ partId, title, requiresPartId }) {
  return (
    <div id={`part-${partId}`} className="scroll-mt-44 mt-8 p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center">
      <Lock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-slate-600">{partId} {title}</h3>
      <p className="text-slate-500 mt-2">通過上一關（{requiresPartId}）的小檢查就能解鎖這一段</p>
    </div>
  );
}

function SectionLockedNotice({ section, missing }) {
  return (
    <div className="animate-fade-in p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center">
      <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-700 mb-2">{SECTION_LABEL[section] || section} 還沒解鎖</h2>
      <p className="text-slate-500">請先完成前面的關卡：{missing.join('、')}</p>
    </div>
  );
}

function WordwallGame({ src, sectionLabel }) {
  return (
    <div className="mt-10 p-5 rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <PartyPopper className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-purple-900">🎮 {sectionLabel} 闖關遊戲</h3>
      </div>
      <p className="text-slate-700 mb-4 text-sm md:text-base">
        恭喜通過所有小檢查！來玩個遊戲驗收一下剛剛學到的東西吧 🎯
      </p>
      <div className="bg-white rounded-lg overflow-hidden border border-slate-300 shadow-inner mx-auto" style={{ maxWidth: '640px' }}>
        <div className="relative w-full" style={{ paddingBottom: `${(380/500)*100}%` }}>
          <iframe
            src={src}
            title={`${sectionLabel} 闖關遊戲`}
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="fullscreen"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3 text-center">由 Wordwall 提供 • 點右下角可全螢幕、可重玩</p>
    </div>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <AppInner />
    </ProgressProvider>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState('textbook');
  const [pdfUrl, setPdfUrl] = useState(null);
  const { isSectionAccessible, unlocked } = useContext(ProgressContext);

  const tryTab = (tab) => {
    if (isSectionAccessible(tab)) setActiveTab(tab);
  };

  const missingFor = (section) => {
    const labels = { '1-1':'1-1 槓桿三要素','1-2':'1-2 三類型','1-3':'1-3 槓桿實驗','2-1':'2-1 剖面圖','2-2':'2-2 輪軸原理','2-3':'2-3 輪軸實驗','3-1':'3-1 滑輪兄弟','3-2':'3-2 滑輪實驗','4-1':'4-1 齒輪與鏈條','4-2':'4-2 齒輪實驗','4-3':'4-3 綜合總整理' };
    const need = section === 'wheel' ? SECTION_PARTS.lever
      : section === 'pulley' ? [...SECTION_PARTS.lever, ...SECTION_PARTS.wheel]
      : section === 'gear' ? [...SECTION_PARTS.lever, ...SECTION_PARTS.wheel, ...SECTION_PARTS.pulley]
      : section === 'quiz' ? PARTS : [];
    return need.filter(p => !unlocked[p]).map(p => labels[p] || p);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden">
      {/* Header (sticky, includes progress bar) */}
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Wrench className="w-7 h-7 md:w-8 md:h-8" />
                六年級自然：簡單機械
              </h1>
              <p className="mt-1 text-blue-100 text-xs md:text-sm">第一單元互動學習網 ｜ 闖關式學習</p>
            </div>
            <nav className="flex flex-wrap gap-2 justify-center">
              <TabButton active={activeTab === 'textbook'} onClick={() => tryTab('textbook')} label="📚 電子課本" />
              <TabButton active={activeTab === 'lever'} onClick={() => tryTab('lever')} label="第1節 槓桿" />
              <TabButton active={activeTab === 'wheel'} onClick={() => tryTab('wheel')} label="第2節 輪軸" locked={!isSectionAccessible('wheel')} />
              <TabButton active={activeTab === 'pulley'} onClick={() => tryTab('pulley')} label="第3節 滑輪" locked={!isSectionAccessible('pulley')} />
              <TabButton active={activeTab === 'gear'} onClick={() => tryTab('gear')} label="第4節 齒輪+綜合" locked={!isSectionAccessible('gear')} />
              <TabButton active={activeTab === 'quiz'} onClick={() => tryTab('quiz')} label="單元總測驗" isQuiz locked={!isSectionAccessible('quiz')} />
            </nav>
          </div>
        </div>
        <TopProgressBar />
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 my-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[80vh]">
        {activeTab === 'textbook' && <TextbookSection pdfUrl={pdfUrl} setPdfUrl={setPdfUrl} />}
        {activeTab === 'lever' && <LeverSection />}
        {activeTab === 'wheel' && (isSectionAccessible('wheel') ? <WheelAxleSection /> : <SectionLockedNotice section="wheel" missing={missingFor('wheel')} />)}
        {activeTab === 'pulley' && (isSectionAccessible('pulley') ? <PulleySection /> : <SectionLockedNotice section="pulley" missing={missingFor('pulley')} />)}
        {activeTab === 'gear' && (isSectionAccessible('gear') ? <GearSection /> : <SectionLockedNotice section="gear" missing={missingFor('gear')} />)}
        {activeTab === 'quiz' && (isSectionAccessible('quiz') ? <QuizSection /> : <SectionLockedNotice section="quiz" missing={missingFor('quiz')} />)}
      </main>

      <footer className="text-center p-6 text-slate-500 text-sm">
        &copy; 2026 國小自然領域互動教材 - 簡單機械單元
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, label, isQuiz, locked }) {
  const base = 'px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base mb-1 flex items-center gap-1';
  let style;
  if (locked) {
    style = 'bg-slate-400/60 text-slate-200 cursor-not-allowed border-b-4 border-slate-500';
  } else if (active) {
    style = 'bg-white text-blue-600 shadow-sm border-b-4 border-blue-400 hover:translate-y-px active:translate-y-1 active:border-b-0';
  } else if (isQuiz) {
    style = 'bg-orange-500 text-white hover:bg-orange-400 border-b-4 border-orange-700 hover:translate-y-px active:translate-y-1 active:border-b-0';
  } else {
    style = 'bg-blue-700 text-white hover:bg-blue-500 border-b-4 border-blue-800 hover:translate-y-px active:translate-y-1 active:border-b-0';
  }
  return (
    <button onClick={locked ? undefined : onClick} disabled={locked}
      title={locked ? '完成前一節才能進入' : undefined}
      className={`${base} ${style}`}>
      {locked && <Lock className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

/* =========================================
   SVG 動畫圖解元件 (教學視覺化核心)
   ========================================= */
const SvgLeverBasic = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes seesaw-basic { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
      @keyframes effort-arrow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
    `}</style>
    {/* 支點 */}
    <polygon points="100,75 85,95 115,95" fill="#64748b" />
    <text x="100" y="105" fontSize="10" fill="#475569" textAnchor="middle" fontWeight="bold">支點</text>
    {/* 槓桿 */}
    <g style={{ animation: 'seesaw-basic 3s infinite ease-in-out', transformOrigin: '100px 75px' }}>
      <rect x="20" y="70" width="160" height="6" rx="3" fill="#f59e0b" />
      {/* 抗力點 */}
      <rect x="30" y="45" width="24" height="24" rx="2" fill="#334155" />
      <text x="42" y="62" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">物</text>
      <text x="42" y="38" fontSize="10" fill="#334155" textAnchor="middle" fontWeight="bold">抗力點</text>
      {/* 施力點 */}
      <g style={{ animation: 'effort-arrow 1.5s infinite ease-in-out' }}>
        <path d="M 170 35 L 170 55" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        <polygon points="165,50 175,50 170,60" fill="#ef4444" />
      </g>
      <text x="170" y="25" fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">施力點</text>
    </g>
  </svg>
);

const SvgCatapult = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-md">
    <style>{`
      @keyframes throw { 0%, 20% { transform: rotate(10deg); } 30%, 80% { transform: rotate(-45deg); } 100% { transform: rotate(10deg); } }
      @keyframes rock { 0%, 20% { transform: translate(0, 0) scale(1); opacity: 1; } 30% { transform: translate(40px, -40px) scale(1.2); opacity: 1; } 50%, 100% { transform: translate(120px, 10px) scale(0.5); opacity: 0; } }
    `}</style>
    <rect x="20" y="80" width="120" height="8" rx="2" fill="#78350f" />
    <polygon points="60,80 70,50 80,80" fill="#92400e" />
    <g style={{ animation: 'throw 3s infinite ease-in-out', transformOrigin: '70px 50px' }}>
       <rect x="30" y="46" width="120" height="8" rx="4" fill="#b45309" />
       <rect x="30" y="30" width="20" height="20" rx="2" fill="#1e293b" />
       <path d="M 140 46 L 155 35 L 160 46 Z" fill="#d97706" />
    </g>
    <circle cx="148" cy="40" r="5" fill="#94a3b8" style={{ animation: 'rock 3s infinite ease-in-out' }} />
  </svg>
);

const SvgBottleOpener = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes lift { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-15deg); } }
      @keyframes cap-pop { 0%, 40%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-5px) rotate(-10deg); } }
    `}</style>
    <path d="M 60 100 L 60 70 L 70 50 L 70 30 L 110 30 L 110 50 L 120 70 L 120 100 Z" fill="#bae6fd" />
    <rect x="65" y="25" width="50" height="10" rx="2" fill="#94a3b8" style={{ transformOrigin: '70px 30px', animation: 'cap-pop 2s infinite' }} />
    <g style={{ transformOrigin: '110px 30px', animation: 'lift 2s infinite ease-in-out' }}>
      <path d="M 105 35 L 115 25 L 170 35 L 170 45 Z" fill="#ef4444" />
      <path d="M 105 35 L 90 30 L 95 20 L 115 25" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinejoin="round" />
    </g>
    <text x="40" y="35" fontSize="10" fill="#64748b" fontWeight="bold">抗力點</text>
    <text x="110" y="20" fontSize="10" fill="#64748b" fontWeight="bold">支點</text>
    <text x="175" y="30" fontSize="10" fill="#ef4444" fontWeight="bold">施力點</text>
  </svg>
);

const SvgTweezers = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-sm overflow-visible">
    <style>{`
      @keyframes pinch-top { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }
      @keyframes pinch-bot { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }
      @keyframes squeeze { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.9); } }
    `}</style>
    <circle cx="160" cy="50" r="8" fill="#f59e0b" style={{ animation: 'squeeze 2s infinite ease-in-out', transformOrigin: '160px 50px' }} />
    <g style={{ animation: 'pinch-top 2s infinite ease-in-out', transformOrigin: '20px 50px' }}>
      <path d="M 20 50 Q 100 25 170 46" stroke="#94a3b8" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M 90 20 L 90 35" stroke="#ef4444" strokeWidth="4" />
      <polygon points="85,30 95,30 90,40" fill="#ef4444" />
    </g>
    <g style={{ animation: 'pinch-bot 2s infinite ease-in-out', transformOrigin: '20px 50px' }}>
      <path d="M 20 50 Q 100 75 170 54" stroke="#94a3b8" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M 90 80 L 90 65" stroke="#ef4444" strokeWidth="4" />
      <polygon points="85,70 95,70 90,60" fill="#ef4444" />
    </g>
    <circle cx="20" cy="50" r="10" fill="#64748b" />
    <text x="20" y="75" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">支點</text>
    <text x="90" y="15" fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">施力點</text>
    <text x="180" y="54" fontSize="10" fill="#d97706" fontWeight="bold">抗力點</text>
  </svg>
);

const SvgSeesaw = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes seesaw-eq { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
    `}</style>
    <polygon points="100,75 85,95 115,95" fill="#3b82f6" />
    <g style={{ animation: 'seesaw-eq 4s infinite ease-in-out', transformOrigin: '100px 75px' }}>
      <rect x="20" y="70" width="160" height="6" rx="3" fill="#fcd34d" />
      <circle cx="40" cy="55" r="12" fill="#ef4444" />
      <rect x="35" y="67" width="10" height="5" fill="#ef4444" />
      <circle cx="160" cy="55" r="12" fill="#22c55e" />
      <rect x="155" y="67" width="10" height="5" fill="#22c55e" />
    </g>
  </svg>
);

const SvgSteeringWheel = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
    <style>{`
      @keyframes steer { 0%, 100% { transform: rotate(-40deg); } 50% { transform: rotate(40deg); } }
    `}</style>
    <g style={{ animation: 'steer 3s infinite ease-in-out', transformOrigin: '50px 50px' }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle cx="50" cy="50" r="12" fill="#334155" />
      <line x1="50" y1="50" x2="15" y2="30" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="50" y1="50" x2="85" y2="30" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="90" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
    </g>
  </svg>
);

const SvgBambooCopter = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes spin-blade { 100% { transform: scaleX(-1); } }
      @keyframes fly-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    `}</style>
    <g style={{ animation: 'fly-up 2s infinite ease-in-out' }}>
       <rect x="48" y="30" width="4" height="40" rx="2" fill="#d97706" />
       <g style={{ animation: 'spin-blade 0.15s infinite linear', transformOrigin: '50px 30px' }}>
         <ellipse cx="50" cy="30" rx="40" ry="4" fill="#fcd34d" />
         <ellipse cx="50" cy="30" rx="8" ry="6" fill="#fbbf24" />
       </g>
    </g>
  </svg>
);

const SvgWheelCrossSection = () => (
  <svg viewBox="0 0 500 240" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes pulse-force { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
    `}</style>

    <defs>
      <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
      </marker>
      <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#b45309" />
      </marker>
    </defs>

    {/* 背景圓:輪與軸 */}
    <circle cx="250" cy="110" r="95" fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
    <circle cx="250" cy="110" r="40" fill="#fff7ed" stroke="#f59e0b" strokeWidth="4" />

    <text x="250" y="35" fontSize="18" fill="#047857" textAnchor="middle" fontWeight="bold">輪 (大圓)</text>
    <text x="250" y="95" fontSize="14" fill="#b45309" textAnchor="middle" fontWeight="bold">軸 (小圓)</text>

    {/* 隱形的槓桿 (水平虛線) */}
    <line x1="120" y1="110" x2="380" y2="110" stroke="#64748b" strokeWidth="3" strokeDasharray="8 4" />

    {/* 支點 (中心點) */}
    <polygon points="250,110 240,128 260,128" fill="#334155" />
    <text x="265" y="132" fontSize="14" fill="#334155" textAnchor="start" fontWeight="bold">支點(中心)</text>

    {/* 施力點在輪 (右側) */}
    <g style={{ animation: 'pulse-force 1.5s infinite ease-in-out' }}>
      <circle cx="345" cy="110" r="6" fill="#16a34a" />
      <line x1="345" y1="110" x2="345" y2="165" stroke="#16a34a" strokeWidth="4" />
      <polygon points="337,160 353,160 345,175" fill="#16a34a" />
      <text x="345" y="195" fontSize="16" fill="#16a34a" textAnchor="middle" fontWeight="bold">施力點</text>
    </g>

    {/* 抗力點在軸 (左側) */}
    <g style={{ animation: 'pulse-force 1.5s infinite ease-in-out', animationDelay: '0.75s' }}>
      <circle cx="210" cy="110" r="6" fill="#dc2626" />
      <line x1="210" y1="110" x2="210" y2="145" stroke="#dc2626" strokeWidth="4" />
      <polygon points="202,140 218,140 210,155" fill="#dc2626" />
      <text x="210" y="175" fontSize="16" fill="#dc2626" textAnchor="middle" fontWeight="bold">抗力點</text>
    </g>

    {/* 輪半徑標示 */}
    <line x1="250" y1="60" x2="345" y2="60" stroke="#047857" strokeWidth="2" markerStart="url(#arrow-green)" markerEnd="url(#arrow-green)" />
    <text x="297" y="50" fontSize="14" fill="#047857" textAnchor="middle" fontWeight="bold">輪半徑 (施力臂)</text>
    <line x1="250" y1="55" x2="250" y2="110" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
    <line x1="345" y1="55" x2="345" y2="110" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>

    {/* 軸半徑標示 */}
    <line x1="210" y1="85" x2="250" y2="85" stroke="#b45309" strokeWidth="2" markerStart="url(#arrow-orange)" markerEnd="url(#arrow-orange)" />
    <text x="230" y="75" fontSize="12" fill="#b45309" textAnchor="middle" fontWeight="bold">軸半徑</text>
    <line x1="210" y1="80" x2="210" y2="110" stroke="#b45309" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
  </svg>
);

const SvgFixedPulleyAnim = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes pull-down-line { 0%, 100% { stroke-dashoffset: 0; } 50% { stroke-dashoffset: 30; } }
      @keyframes p-move-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
      @keyframes p-move-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(20px); } }
      @keyframes p-spin { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
    `}</style>
    <rect x="30" y="0" width="40" height="8" fill="#475569" />
    <rect x="48" y="8" width="4" height="20" fill="#64748b" />
    <g style={{ animation: 'p-spin 3s infinite ease-in-out', transformOrigin: '50px 30px' }}>
      <circle cx="50" cy="30" r="15" fill="#fcd34d" stroke="#d97706" strokeWidth="4" />
      <line x1="50" y1="15" x2="50" y2="45" stroke="#d97706" strokeWidth="2" />
    </g>
    <line x1="35" y1="30" x2="35" y2="70" stroke="#1e293b" strokeWidth="2" />
    <g style={{ animation: 'p-move-up 3s infinite ease-in-out' }}>
      <rect x="25" y="70" width="20" height="20" rx="2" fill="#3b82f6" />
      <text x="35" y="84" fontSize="10" fill="white" textAnchor="middle">物</text>
    </g>
    <line x1="65" y1="30" x2="65" y2="80" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" style={{ animation: 'pull-down-line 3s infinite ease-in-out' }} />
    <g style={{ animation: 'p-move-down 3s infinite ease-in-out' }}>
      <polygon points="60,80 70,80 65,95" fill="#ef4444" />
    </g>
  </svg>
);

const SvgMovablePulleyAnim = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <style>{`
      @keyframes sys-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-25px); } }
      @keyframes hand-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-50px); } }
      @keyframes r-left { 0%, 100% { height: 60px; } 50% { height: 35px; } }
      @keyframes p-spin-mov { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-180deg); } }
    `}</style>
    <rect x="20" y="0" width="60" height="8" fill="#475569" />
    <line x1="35" y1="8" x2="35" y2="60" stroke="#1e293b" strokeWidth="2" style={{ animation: 'r-left 3s infinite ease-in-out' }} />
    <g style={{ animation: 'sys-up 3s infinite ease-in-out' }}>
      <path d="M 35 60 A 15 15 0 0 0 65 60" fill="none" stroke="#1e293b" strokeWidth="2" />
      <g style={{ animation: 'p-spin-mov 3s infinite ease-in-out', transformOrigin: '50px 60px' }}>
        <circle cx="50" cy="60" r="15" fill="#22c55e" stroke="#16a34a" strokeWidth="4" />
        <line x1="50" y1="45" x2="50" y2="75" stroke="#16a34a" strokeWidth="2" />
      </g>
      <rect x="40" y="75" width="20" height="20" rx="2" fill="#334155" />
      <text x="50" y="89" fontSize="10" fill="white" textAnchor="middle">物</text>
    </g>
    <line x1="65" y1="60" x2="65" y2="150" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" style={{ animation: 'hand-up 3s infinite ease-in-out' }} />
    <g style={{ animation: 'hand-up 3s infinite ease-in-out' }}>
      <polygon points="60,95 70,95 65,80" fill="#ef4444" />
    </g>
  </svg>
);

const SvgMeshedGears = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full overflow-hidden">
    <style>{`
      @keyframes spin-cw { 100% { transform: rotate(360deg); } }
      @keyframes spin-ccw { 100% { transform: rotate(-360deg); } }
    `}</style>
    <g style={{ transformOrigin: '70px 50px', animation: 'spin-cw 4s linear infinite' }}>
      <circle cx="70" cy="50" r="35" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="12 8" />
      <circle cx="70" cy="50" r="28" fill="#fca5a5" />
      <circle cx="70" cy="50" r="8" fill="#7f1d1d" />
    </g>
    <g style={{ transformOrigin: '142px 50px', animation: 'spin-ccw 2s linear infinite' }}>
      <circle cx="142" cy="50" r="22" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="12 8" />
      <circle cx="142" cy="50" r="15" fill="#86efac" />
      <circle cx="142" cy="50" r="6" fill="#14532d" />
    </g>
  </svg>
);

const SvgChainGears = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full overflow-hidden">
    <style>{`
      @keyframes spin-cw { 100% { transform: rotate(360deg); } }
      @keyframes chain-move { 100% { stroke-dashoffset: -30; } }
    `}</style>
    {/* 鏈條 */}
    <rect x="50" y="25" width="100" height="50" rx="25" fill="none" stroke="#475569" strokeWidth="8" strokeDasharray="10 5" style={{ animation: 'chain-move 1.5s linear infinite' }} />
    <g style={{ transformOrigin: '50px 50px', animation: 'spin-cw 3s linear infinite' }}>
      <circle cx="50" cy="50" r="25" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="8 4" />
      <circle cx="50" cy="50" r="18" fill="#93c5fd" />
      <circle cx="50" cy="50" r="6" fill="#1e3a8a" />
      {/* 踏板 */}
      <line x1="50" y1="50" x2="50" y2="10" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <rect x="40" y="5" width="20" height="6" rx="2" fill="#f59e0b" />
    </g>
    <g style={{ transformOrigin: '150px 50px', animation: 'spin-cw 1.5s linear infinite' }}>
      <circle cx="150" cy="50" r="15" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray="6 3" />
      <circle cx="150" cy="50" r="10" fill="#93c5fd" />
      <circle cx="150" cy="50" r="4" fill="#1e3a8a" />
    </g>
  </svg>
);

const SvgClockGears = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full overflow-hidden">
    <style>{`
      @keyframes s-cw { 100% { transform: rotate(360deg); } }
      @keyframes s-ccw { 100% { transform: rotate(-360deg); } }
    `}</style>
    <g style={{ transformOrigin: '50px 50px', animation: 's-cw 6s linear infinite' }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="10" strokeDasharray="10 6" />
      <circle cx="50" cy="50" r="32" fill="#fde68a" />
      <circle cx="50" cy="50" r="5" fill="#b45309" />
    </g>
    <g style={{ transformOrigin: '115px 30px', animation: 's-ccw 3s linear infinite' }}>
      <circle cx="115" cy="30" r="20" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="8 5" />
      <circle cx="115" cy="30" r="14" fill="#a7f3d0" />
      <circle cx="115" cy="30" r="4" fill="#047857" />
    </g>
    <g style={{ transformOrigin: '155px 65px', animation: 's-cw 1.5s linear infinite' }}>
      <circle cx="155" cy="65" r="15" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeDasharray="6 4" />
      <circle cx="155" cy="65" r="10" fill="#ddd6fe" />
      <circle cx="155" cy="65" r="3" fill="#4c1d95" />
    </g>
  </svg>
);

const SvgEscalator = () => (
  <svg viewBox="0 0 200 100" className="w-full h-full overflow-hidden">
    <style>{`
       @keyframes move-up-right { 0% { transform: translate(-20px, 20px); } 100% { transform: translate(0px, 0px); } }
    `}</style>
    {/* 軌道背板 */}
    <polygon points="10,100 160,-20 180,-20 30,100" fill="#e2e8f0" />
    <g style={{ animation: 'move-up-right 1s linear infinite' }}>
      {Array.from({length: 12}).map((_, i) => (
         <polyline key={i} points={`${i*20},${120-i*20} ${i*20+20},${120-i*20} ${i*20+20},${100-i*20}`} fill="#94a3b8" stroke="#475569" strokeWidth="2" />
      ))}
    </g>
    {/* 扶手帶 */}
    <line x1="5" y1="80" x2="155" y2="-40" stroke="#1e293b" strokeWidth="8" />
    <line x1="5" y1="80" x2="155" y2="-40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="10 10" style={{ animation: 'move-up-right 0.5s linear infinite' }} />
  </svg>
);

/* =========================================
   Section: Textbook (電子課本)
   ========================================= */
function TextbookSection({ pdfUrl, setPdfUrl }) {
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('請上傳 PDF 格式的檔案喔！');
      return;
    }
    setError('');
    const fileUrl = URL.createObjectURL(file);
    setPdfUrl(fileUrl);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2 border-b pb-2">
        <FileText className="text-blue-500" /> 電子課本閱讀區
      </h2>
      {!pdfUrl ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center flex flex-col items-center justify-center flex-grow min-h-[50vh]">
          <FileDown className="w-16 h-16 text-slate-400 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">上傳您的電子課本</h3>
          <p className="text-slate-500 mb-6">請選擇 PDF 檔案進行上傳,上傳後即可直接在這裡閱讀課本內容。</p>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-md hover:shadow-lg">
            選擇 PDF 檔案
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
          {error && <p className="text-red-500 mt-4 bg-red-50 px-4 py-2 rounded-md">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col flex-grow h-[70vh]">
          <div className="flex justify-between items-center mb-4 bg-slate-100 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5"/> 課本已載入
            </span>
            <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-bold transition-colors">
              重新選擇檔案
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <iframe src={pdfUrl} className="w-full h-full rounded-lg border border-slate-300 shadow-sm" title="PDF Viewer" />
        </div>
      )}
    </div>
  );
}

/* =========================================
   Section 1: Lever (槓桿)
   ========================================= */
function LeverSection() {
  const { unlocked } = useContext(ProgressContext);
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2 border-b pb-2">
        <Scale className="text-blue-500" /> 第 1 節:認識槓桿原理
      </h2>

      {/* Part 1-1 */}
      <section id="part-1-1" className="scroll-mt-44 mb-10">
      <PartHeader number="1-1" title="槓桿三要素" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title="重點整理:槓桿三要素" icon={<BookOpen className="text-green-500" />}>
          <div className="aspect-[2/1] mb-4 bg-blue-50 rounded-lg overflow-hidden border border-slate-200">
            <SvgLeverBasic />
          </div>
          <ul className="space-y-2 list-disc ml-5 text-slate-700">
            <li><strong>支點:</strong>槓桿轉動時,固定不動的點。</li>
            <li><strong>施力點:</strong>我們手出力的地方。</li>
            <li><strong>抗力點:</strong>物體重量或抵抗我們施力的地方。</li>
            <li><strong>力臂:</strong>「施力點到支點」叫施力臂;「抗力點到支點」叫抗力臂。</li>
          </ul>
        </Card>

        <Card title="課外補充:阿基米德與投石器" icon={<Lightbulb className="text-amber-500" />}>
          <div className="aspect-[2/1] mb-4 bg-amber-50 rounded-lg overflow-hidden border border-slate-200">
            <SvgCatapult />
          </div>
          <p className="text-slate-700"><strong>「只要給我一個支點,我就能舉起地球。」</strong></p>
          <p className="text-sm mt-2 text-slate-600">
            古希臘科學家阿基米德歸納出了槓桿原理。在戰爭中,他利用「超長的施力臂加上重物落下」發明了投石器,把巨大的石頭像子彈一樣拋向敵軍,是經典的槓桿武器！
          </p>
        </Card>
      </div>
      <MiniQuiz partId="1-1" nextPartId="1-2" />
      </section>

      {/* Part 1-2 */}
      {unlocked['1-1'] ? (
      <section id="part-1-2" className="scroll-mt-44 mb-10">
      <PartHeader number="1-2" title="槓桿三種類型" />
      <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2 border-b pb-2 mt-2">
        <Lightbulb className="text-amber-500" /> 生活中的槓桿應用大集合
      </h3>
      {/* 放大圖片:調整 grid 排版為 lg:grid-cols-3,並增加 gap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ApplicationCard
          type="省力槓桿"
          condition="施力臂 > 抗力臂"
          svg={<SvgBottleOpener />}
          desc="抗力點在中間。因為施力臂較長,可以用較小的力氣拔起緊緊的瓶蓋或釘子。"
          color="green"
        />
        <ApplicationCard
          type="費力槓桿"
          condition="施力臂 < 抗力臂"
          svg={<SvgTweezers />}
          desc="施力點在中間。雖然比較費力,但可以精準、方便地夾取遠處的食物或小零件。"
          color="red"
        />
        <ApplicationCard
          type="等臂槓桿"
          condition="施力臂 = 抗力臂"
          svg={<SvgSeesaw />}
          desc="支點在正中間。不省力也不費力,主要用來改變力的方向或是測量重量的平衡。"
          color="blue"
        />
      </div>

      {/* 新增:槓桿三種類型總結表 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
        <div className="bg-blue-100 p-4 border-b border-blue-200">
          <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> 槓桿三種類型總結表
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="p-4 border-b border-slate-200 font-bold w-1/5">槓桿類型</th>
                <th className="p-4 border-b border-slate-200 font-bold w-1/5">力臂關係</th>
                <th className="p-4 border-b border-slate-200 font-bold w-2/5">特色</th>
                <th className="p-4 border-b border-slate-200 font-bold w-1/5">生活實例</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border-b border-slate-100 font-black text-green-700">省力槓桿</td>
                <td className="p-4 border-b border-slate-100 bg-green-50/50 font-bold">施力臂 &gt; 抗力臂</td>
                <td className="p-4 border-b border-slate-100">省力,但施力移動距離較長 (費時)</td>
                <td className="p-4 border-b border-slate-100">開瓶器、拔釘器、榨汁器、裁紙刀</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border-b border-slate-100 font-black text-red-700">費力槓桿</td>
                <td className="p-4 border-b border-slate-100 bg-red-50/50 font-bold">施力臂 &lt; 抗力臂</td>
                <td className="p-4 border-b border-slate-100">費力,但能精準操作、節省移動距離 (省時)</td>
                <td className="p-4 border-b border-slate-100">麵包夾、鑷子、筷子、掃把、球棒</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border-b border-slate-100 font-black text-blue-700">等臂槓桿</td>
                <td className="p-4 border-b border-slate-100 bg-blue-50/50 font-bold">施力臂 = 抗力臂</td>
                <td className="p-4 border-b border-slate-100">不省力也不費力,主要用來改變施力方向或測量</td>
                <td className="p-4 border-b border-slate-100">翹翹板、天平</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <MiniQuiz partId="1-2" nextPartId="1-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="1-2" title="槓桿三種類型" requiresPartId="1-1" />
      )}

      {/* Part 1-3 */}
      {unlocked['1-2'] ? (
      <section id="part-1-3" className="scroll-mt-44 mb-10">
      <PartHeader number="1-3" title="槓桿實驗室" />
      <LeverLab />
      <MiniQuiz partId="1-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="1-3" title="槓桿實驗室" requiresPartId="1-2" />
      )}

      {/* Wordwall Game：1-3 通過後出現 */}
      {unlocked['1-3'] && (
        <WordwallGame
          src="https://wordwall.net/tc/embed/c03fb77019e24157ac9164cf8d9f6385?themeId=23&templateId=49&fontStackId=0"
          sectionLabel="第 1 節 槓桿"
        />
      )}
    </div>
  );
}

function LeverLab() {
  const resistanceWeight = 20;
  const resistanceArm = 3;
  const leftTorque = resistanceWeight * resistanceArm;

  const [effortArm, setEffortArm] = useState(3);
  const [appliedForce, setAppliedForce] = useState(0);

  const rightTorque = appliedForce * effortArm;
  const netTorque = rightTorque - leftTorque;

  let angle = netTorque * 0.8;
  if (angle > 20) angle = 20;
  if (angle < -20) angle = -20;

  const isBalanced = (netTorque === 0 && appliedForce > 0);

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
        <Scale className="text-blue-500" /> 物理互動實驗室:尋找槓桿平衡點
      </h3>
      <p className="text-slate-600 mb-6 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        📝 <strong>實驗任務:</strong>左邊掛著 <strong>20g</strong> 重的物體(距離支點 3 格)。<br/>
        請你調整右邊的<strong className="text-blue-600">「施力位置」</strong>與<strong className="text-red-600">「往下拉的力量」</strong>,試著讓槓桿恢復水平平衡！
      </p>

      <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl p-8 mb-6 relative overflow-hidden flex flex-col items-center min-h-[400px] justify-center border border-blue-200">

        {isBalanced && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-2 z-50">
            <CheckCircle2 /> 恭喜！槓桿完美平衡！
          </div>
        )}

        <div className="relative w-full max-w-lg flex items-center justify-center mt-10">

          <div className="absolute top-0 mt-2 w-0 h-0 border-l-[25px] border-r-[25px] border-b-[40px] border-transparent border-b-slate-700 z-10">
             <div className="absolute top-10 -left-6 w-12 h-3 bg-slate-800 rounded"></div>
          </div>

          <div
            className="absolute w-full h-4 bg-orange-300 border-2 border-orange-500 z-20 transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center center' }}
          >
            {[6,5,4,3,2,1].map(num => (
              <div key={`L${num}`} className="absolute w-2 h-2 bg-white rounded-full" style={{ left: `${50 - (num * 8.33)}%`, transform: 'translateX(-50%)', top: '2px' }}></div>
            ))}
            <div className="absolute w-3 h-3 bg-slate-900 rounded-full" style={{ left: '50%', transform: 'translateX(-50%)', top: '-1px' }}></div>
            {[1,2,3,4,5,6].map(num => (
              <div key={`R${num}`} className="absolute w-2 h-2 bg-white rounded-full" style={{ left: `${50 + (num * 8.33)}%`, transform: 'translateX(-50%)', top: '2px' }}></div>
            ))}

            <div
              className="absolute top-4 flex flex-col items-center transition-transform duration-500 ease-out"
              style={{ left: `${50 - (resistanceArm * 8.33)}%`, transform: `translateX(-50%) rotate(${-angle}deg)`, transformOrigin: 'top center' }}
            >
              <div className="w-0.5 h-16 bg-slate-500"></div>
              <div className="w-10 h-10 bg-slate-700 flex items-center justify-center text-white font-bold text-sm rounded shadow-lg border-b-4 border-slate-900">20g</div>
            </div>

            <div
              className="absolute top-4 flex flex-col items-center transition-all duration-500 ease-out"
              style={{ left: `${50 + (effortArm * 8.33)}%`, transform: `translateX(-50%) rotate(${-angle}deg)`, transformOrigin: 'top center' }}
            >
              <div className="w-0.5 h-10 bg-slate-500"></div>
              <div className="w-8 h-16 bg-yellow-400 rounded-sm flex flex-col items-center justify-center border-2 border-yellow-600 shadow-md relative">
                <span className="text-xs font-black text-red-600">{appliedForce}g</span>
                <div className="absolute top-full w-1 bg-gray-400 transition-all" style={{ height: `${appliedForce * 0.8}px` }}></div>
                <Hand className="absolute text-orange-600 w-8 h-8 transition-all" style={{ top: `calc(100% + ${appliedForce * 0.8}px)` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="flex justify-between font-bold text-slate-700 mb-2">
            <span>1. 往下拉的力量 (施力大小)</span>
            <span className="text-red-600">{appliedForce} g</span>
          </label>
          <input
            type="range" min="0" max="60" step="1"
            value={appliedForce}
            onChange={(e) => setAppliedForce(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
            <span>0g (不出力)</span>
            <span>60g (用力拉)</span>
          </div>
        </div>

        <div>
          <label className="flex justify-between font-bold text-slate-700 mb-2">
            <span>2. 選擇施力點位置 (施力臂)</span>
            <span className="text-blue-600">第 {effortArm} 格</span>
          </label>
          <input
            type="range" min="1" max="6" step="1"
            value={effortArm}
            onChange={(e) => setEffortArm(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
            <span>近 (費力)</span>
            <span>遠 (省力)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   Section 2: Wheel & Axle, Pulleys (輪軸與滑輪)
   ========================================= */
function WheelAxleSection() {
  const { unlocked } = useContext(ProgressContext);
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2 border-b pb-2">
        <RotateCw className="text-blue-500" /> 第 2 節:認識輪軸
      </h2>

      {/* Part 2-1 */}
      <section id="part-2-1" className="scroll-mt-44 mb-10">
      <PartHeader number="2-1" title="輪軸剖面圖" />
      <div className="mb-2">
        <Card title="剖面圖解析:輪軸是一種「隱形的槓桿」(課本 P.31)" icon={<Scale className="text-blue-500" />}>
          <div className="flex flex-col gap-6">
            <div className="w-full bg-slate-50 rounded-xl border-2 border-slate-200 p-4 flex items-center justify-center overflow-hidden">
              <div className="w-full max-w-3xl aspect-[2/1]">
                <SvgWheelCrossSection />
              </div>
            </div>

            <div className="w-full space-y-4 px-2">
               <p className="text-slate-700 text-lg">
                 從正面剖開來看,輪軸就像是一個<strong>可以連續旋轉的槓桿</strong>！
               </p>
               <ul className="space-y-3 list-disc ml-5 text-slate-700">
                 <li><strong>支點:</strong>輪與軸共同的<strong className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded ml-1">中心點</strong>。</li>
                 <li><strong>力臂:</strong>從中心點往外連到邊緣的直線。<br/>大圓的半徑叫做<strong className="text-green-700 bg-green-50 px-2 py-0.5 rounded mx-1">「輪半徑」</strong>,小圓的半徑叫做<strong className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded mx-1">「軸半徑」</strong>。</li>
                 <li className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4 list-none -ml-5 shadow-sm">
                   <Lightbulb className="inline-block w-6 h-6 text-amber-500 mr-2 -mt-1" />
                   <strong className="text-blue-900 text-lg">為什麼施力在「輪」會省力？</strong><br/>
                   <span className="block mt-2 text-slate-700">當力氣施加在輪上時,<span className="text-green-700 font-bold bg-green-100 px-1 rounded">施力臂(輪半徑) &gt; 抗力臂(軸半徑)</span>。根據槓桿原理,只要施力臂大於抗力臂,就能用比較小的力氣舉起重物,所以會省力喔！</span>
                 </li>
               </ul>
            </div>
          </div>
        </Card>
      </div>
      <MiniQuiz partId="2-1" nextPartId="2-2" />
      </section>

      {/* Part 2-2 */}
      {unlocked['2-1'] ? (
      <section id="part-2-2" className="scroll-mt-44 mb-10">
      <PartHeader number="2-2" title="輪軸原理與應用" />
      <div className="mb-2">
        <Card title="重點整理:輪軸原理與應用" icon={<BookOpen className="text-green-500" />}>
          <div className="grid grid-cols-2 gap-4 mb-4 max-w-2xl">
            <div className="aspect-square bg-green-50 rounded-lg overflow-hidden border border-slate-200 relative">
               <span className="absolute top-2 left-2 text-xs font-bold text-green-700 bg-white px-2 py-1 rounded shadow-sm z-10">方向盤</span>
               <SvgSteeringWheel />
            </div>
            <div className="aspect-square bg-red-50 rounded-lg overflow-hidden border border-slate-200 relative">
               <span className="absolute top-2 left-2 text-xs font-bold text-red-700 bg-white px-2 py-1 rounded shadow-sm z-10">竹蜻蜓</span>
               <SvgBambooCopter />
            </div>
          </div>
          <ul className="space-y-2 list-disc ml-5 text-slate-700">
            <li><strong>輪軸也是槓桿:</strong>大圓是「輪」,小圓是「軸」。兩者會同步轉動。</li>
            <li><strong>施力在輪:</strong>輪半徑大於軸半徑,所以<span className="text-green-600 font-bold">省力</span>。(如方向盤、螺絲起子把手)</li>
            <li><strong>施力在軸:</strong>軸半徑小於輪半徑,所以<span className="text-red-600 font-bold">費力</span>,但能加快末端速度。(如竹蜻蜓、電風扇)</li>
          </ul>
        </Card>
      </div>
      <MiniQuiz partId="2-2" nextPartId="2-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="2-2" title="輪軸原理與應用" requiresPartId="2-1" />
      )}

      {/* Part 2-3 */}
      {unlocked['2-2'] ? (
      <section id="part-2-3" className="scroll-mt-44 mb-10">
      <PartHeader number="2-3" title="輪軸實驗室" />
      <WheelLab />
      <MiniQuiz partId="2-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="2-3" title="輪軸實驗室" requiresPartId="2-2" />
      )}

      {/* Wordwall Game：2-3 通過後出現 */}
      {unlocked['2-3'] && (
        <WordwallGame
          src="https://wordwall.net/tc/embed/07810805580f4421bbbddacb14fbc6b4?themeId=1&templateId=5&fontStackId=0"
          sectionLabel="第 2 節 輪軸"
        />
      )}
    </div>
  );
}

function PulleySection() {
  const { unlocked } = useContext(ProgressContext);
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2 border-b pb-2">
        <RotateCw className="text-blue-500" /> 第 3 節:認識滑輪
      </h2>

      {/* Part 3-1 */}
      <section id="part-3-1" className="scroll-mt-44 mb-10">
      <PartHeader number="3-1" title="滑輪兄弟（定滑輪 vs 動滑輪）" />
      <div className="mb-2">
        <Card title="重點整理:滑輪兄弟" icon={<BookOpen className="text-green-500" />}>
          <div className="grid grid-cols-2 gap-4 mb-4 max-w-2xl">
            <div className="aspect-square bg-blue-50 rounded-lg overflow-hidden border border-slate-200 relative">
               <span className="absolute top-2 left-2 text-xs font-bold text-blue-700 bg-white px-2 py-1 rounded shadow-sm z-10">定滑輪</span>
               <SvgFixedPulleyAnim />
            </div>
            <div className="aspect-square bg-green-50 rounded-lg overflow-hidden border border-slate-200 relative">
               <span className="absolute top-2 left-2 text-xs font-bold text-green-700 bg-white px-2 py-1 rounded shadow-sm z-10">動滑輪</span>
               <SvgMovablePulleyAnim />
            </div>
          </div>
          <ul className="space-y-2 list-disc ml-5 text-slate-700">
            <li><strong>定滑輪:</strong>固定在一個地方不移動。<br/><span className="text-blue-600 font-bold">不省力</span>,但能<span className="text-blue-600 font-bold">改變施力方向</span>。生活中常見於升旗桿、窗簾。</li>
            <li><strong>動滑輪:</strong>會跟著重物一起上下移動。<br/>能<span className="text-green-600 font-bold">省一半的力</span>,但<span className="text-red-500 font-bold">不能改變施力方向</span>。生活中常見於起重機、吊掛系統。</li>
          </ul>
        </Card>
      </div>
      <MiniQuiz partId="3-1" nextPartId="3-2" />
      </section>

      {/* Part 3-2 */}
      {unlocked['3-1'] ? (
      <section id="part-3-2" className="scroll-mt-44 mb-10">
      <PartHeader number="3-2" title="滑輪實驗室" />
      <PulleyLab />
      <MiniQuiz partId="3-2" />
      </section>
      ) : (
        <LockedPlaceholder partId="3-2" title="滑輪實驗室" requiresPartId="3-1" />
      )}
    </div>
  );
}

function WheelLab() {
  const [forceOn, setForceOn] = useState('wheel');
  const [pullProgress, setPullProgress] = useState(0);

  useEffect(() => { setPullProgress(0); }, [forceOn]);

  const isWheel = forceOn === 'wheel';
  const weight = 100;
  const effortNeeded = isWheel ? weight / 2 : weight * 2;

  const pullDistance = pullProgress;
  const rotationAngle = isWheel ? pullDistance * 2 : pullDistance * 4;
  const weightLiftDistance = isWheel ? pullDistance / 2 : pullDistance * 2;

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
        <Gamepad2 className="text-purple-500" /> 物理互動實驗室:輪軸省力大挑戰
      </h3>
      <p className="text-slate-600 mb-6 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        📝 <strong>實驗任務:</strong>這是一個「輪半徑為2、軸半徑為1」的輪軸,下方掛著 100g 的重物。<br/>
        請先選擇施力位置,然後<strong>拖曳下方的「拉動繩子」滑桿</strong>,觀察齒輪旋轉與重物上升的差異！
      </p>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center bg-white p-6 rounded-xl shadow-inner border border-slate-100">

        <div className="relative w-full max-w-sm min-h-[450px] flex items-start justify-center pt-10 overflow-hidden bg-blue-50 rounded-xl border border-blue-100">
          <div className="absolute top-0 w-4 h-[40%] bg-slate-700 z-0 rounded-b"></div>

          <div
            className="absolute top-10 w-36 h-36 bg-red-400 rounded-full border-4 border-red-600 shadow-lg flex items-center justify-center z-10"
            style={{ transform: `rotate(${rotationAngle}deg)` }}
          >
            <div className="absolute w-full h-1 bg-red-700/30"></div>
            <div className="absolute w-1 h-full bg-red-700/30"></div>

            <div className="w-16 h-16 bg-orange-300 rounded-full border-4 border-orange-500 shadow-inner z-20 flex items-center justify-center relative">
              <div className="absolute w-full h-1 bg-orange-600/30"></div>
              <div className="absolute w-1 h-full bg-orange-600/30"></div>
              <div className="w-4 h-4 bg-slate-800 rounded-full z-30"></div>
            </div>
          </div>

          <div className="absolute flex flex-col items-center z-0 -translate-x-1/2" style={{ top: '112px', left: 'calc(50% - 70px)' }}>
             <div className="w-1 bg-slate-400" style={{ height: isWheel ? `${80 + pullDistance}px` : `${140 - weightLiftDistance}px` }}></div>
             {isWheel ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-14 bg-yellow-400 rounded border border-yellow-600 flex items-center justify-center text-xs font-bold shadow-md relative">
                    {effortNeeded}g
                    <Hand className="absolute top-12 text-orange-600 w-8 h-8" />
                  </div>
                </div>
             ) : (
                <div className="w-12 h-12 bg-slate-700 flex items-center justify-center text-white font-bold text-sm rounded shadow-md border-b-4 border-slate-900">100g</div>
             )}
          </div>

          <div className="absolute flex flex-col items-center z-0 -translate-x-1/2" style={{ top: '112px', left: 'calc(50% + 30px)' }}>
             <div className="w-1 bg-slate-600" style={{ height: isWheel ? `${140 - weightLiftDistance}px` : `${80 + pullDistance}px` }}></div>
             {!isWheel ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-14 bg-yellow-400 rounded border border-yellow-600 flex items-center justify-center text-xs font-bold shadow-md relative">
                    {effortNeeded}g
                    <Hand className="absolute top-12 text-orange-600 w-8 h-8" />
                  </div>
                </div>
             ) : (
                <div className="w-12 h-12 bg-slate-700 flex items-center justify-center text-white font-bold text-sm rounded shadow-md border-b-4 border-slate-900">100g</div>
             )}
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full lg:w-1/2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setForceOn('wheel')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${forceOn === 'wheel' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
              施力在「輪」 (省力)
            </button>
            <button onClick={() => setForceOn('axle')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${forceOn === 'axle' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
              施力在「軸」 (費力)
            </button>
          </div>

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-300">
            <label className="font-bold text-slate-700 mb-4 block flex justify-between">
              <span>👇 請往下拉動繩子</span>
              <span className="text-blue-600">拉動距離:{pullDistance} cm</span>
            </label>
            <input
              type="range" min="0" max="100" step="1"
              value={pullProgress}
              onChange={(e) => setPullProgress(Number(e.target.value))}
              className="w-full h-4 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
                <div className="text-xs text-slate-500">你花的力氣</div>
                <div className={`text-xl font-black ${isWheel ? 'text-green-600' : 'text-red-600'}`}>{effortNeeded} g</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
                <div className="text-xs text-slate-500">重物上升距離</div>
                <div className="text-xl font-black text-blue-600">{weightLiftDistance} cm</div>
              </div>
            </div>

            <p className="text-sm text-slate-600 mt-4 font-medium text-center bg-yellow-100 p-2 rounded">
              {isWheel
                ? '💡 省力,但手要拉很長的距離,物體才上升一點點！'
                : '💡 費力,但手只要拉一點點,物體就會上升很多！'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulleyLab() {
  const [pulleyType, setPulleyType] = useState('fixed');
  const [pullProgress, setPullProgress] = useState(0);

  useEffect(() => { setPullProgress(0); }, [pulleyType]);

  const isFixed = pulleyType === 'fixed';
  const weight = 100;
  const effortNeeded = isFixed ? weight : weight / 2;

  const pullDistance = pullProgress;
  const rotationAngle = isFixed ? pullDistance * 3 : pullDistance * 1.5;
  const weightLiftDistance = isFixed ? pullDistance : pullDistance / 2;

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
        <Gamepad2 className="text-purple-500" /> 物理互動實驗室:滑輪兄弟大解密
      </h3>
      <p className="text-slate-600 mb-6 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        📝 <strong>實驗任務:</strong>這顆滑輪掛著 100g 的重物。拉動下方滑桿模擬「手拉繩子」,比較定滑輪和動滑輪的<strong>施力方向</strong>與<strong>重物上升距離</strong>！
      </p>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center bg-white p-6 rounded-xl shadow-inner border border-slate-100">

        <div className="relative w-full max-w-sm min-h-[480px] bg-blue-50 rounded-xl border border-blue-100 overflow-hidden pt-4 flex justify-center">
          <div className="absolute top-0 w-full h-4 bg-slate-800 z-30"></div>

          {isFixed ? (
            <>
              <div className="absolute top-4 w-2 h-16 bg-slate-600 left-1/2 -translate-x-1/2"></div>

              <div className="absolute w-[56px] h-[28px] border-t-4 border-l-4 border-r-4 border-slate-800 rounded-t-full z-0" style={{ top: `64px`, left: '50%', transform: 'translateX(-50%)' }}></div>

              <div
                className="absolute top-16 w-14 h-14 bg-yellow-200 rounded-full border-4 border-yellow-500 z-10 flex items-center justify-center left-1/2 -translate-x-1/2"
                style={{ transform: `translateX(-50%) rotate(${rotationAngle}deg)` }}
              >
                <div className="w-full h-0.5 bg-yellow-600/50 absolute"></div>
                <div className="w-0.5 h-full bg-yellow-600/50 absolute"></div>
                <div className="w-2 h-2 bg-slate-800 rounded-full z-20"></div>
              </div>

              <div className="absolute flex flex-col items-center -translate-x-1/2" style={{ top: '92px', left: 'calc(50% - 26px)' }}>
                <div className="w-1 bg-slate-800" style={{ height: `${164 - weightLiftDistance}px` }}></div>
                <div className="w-12 h-12 bg-slate-700 flex items-center justify-center text-white font-bold text-sm rounded border-b-4 border-slate-900 shadow-md z-20">100g</div>
                {pullProgress > 0 && <ArrowUp className="text-blue-500 mt-2 animate-bounce w-8 h-8" />}
              </div>

              <div className="absolute flex flex-col items-center -translate-x-1/2" style={{ top: '92px', left: 'calc(50% + 26px)' }}>
                <div className="w-1 bg-slate-800" style={{ height: `${104 + pullDistance}px` }}></div>
                <Hand className="text-orange-600 w-10 h-10 -mt-2 z-20" />
                {pullProgress > 0 && <ArrowDown className="text-red-500 mt-2 animate-bounce w-8 h-8" />}
              </div>
            </>
          ) : (
            <>
              <div className="absolute w-1 bg-slate-800 z-0 -translate-x-1/2" style={{ top: '16px', left: 'calc(50% - 26px)', height: `${202 - weightLiftDistance}px` }}></div>

              <div className="absolute w-[56px] h-[28px] border-b-4 border-l-4 border-r-4 border-slate-800 rounded-b-full z-0" style={{ top: `${218 - weightLiftDistance}px`, left: '50%', transform: 'translateX(-50%)' }}></div>

              <div
                className="absolute w-14 h-14 bg-yellow-200 rounded-full border-4 border-yellow-500 z-10 flex items-center justify-center"
                style={{ top: `${190 - weightLiftDistance}px`, left: '50%', transform: `translateX(-50%) rotate(${rotationAngle}deg)` }}
              >
                <div className="w-full h-0.5 bg-yellow-600/50 absolute"></div>
                <div className="w-0.5 h-full bg-yellow-600/50 absolute"></div>
                <div className="w-2 h-2 bg-slate-800 rounded-full z-20"></div>
              </div>

              <div className="absolute left-[50%] -translate-x-1/2 flex flex-col items-center z-0" style={{ top: `${244 - weightLiftDistance}px` }}>
                <div className="w-1.5 h-6 bg-slate-600"></div>
                <div className="w-12 h-12 bg-slate-700 flex items-center justify-center text-white font-bold text-sm rounded border-b-4 border-slate-900 shadow-md">100g</div>
                {pullProgress > 0 && <ArrowUp className="text-blue-500 mt-2 animate-bounce w-8 h-8" />}
              </div>

              <div className="absolute flex flex-col items-center z-0 -translate-x-1/2" style={{ left: 'calc(50% + 26px)', top: `${190 - weightLiftDistance - pullDistance}px` }}>
                <Hand className="text-orange-600 w-10 h-10 -mt-8 z-20" />
                <div className="w-1 bg-slate-800" style={{ height: `${28 + pullDistance}px` }}></div>
                {pullProgress > 0 && <ArrowUp className="text-red-500 absolute top-[-60px] animate-bounce w-8 h-8" />}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6 w-full lg:w-1/2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setPulleyType('fixed')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${pulleyType === 'fixed' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
              定滑輪
            </button>
            <button onClick={() => setPulleyType('movable')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${pulleyType === 'movable' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
              動滑輪
            </button>
          </div>

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-300">
            <label className="font-bold text-slate-700 mb-4 block flex justify-between">
              <span>{isFixed ? '👇 往下拉動繩子' : '👆 往上拉動繩子'}</span>
            </label>
            <input
              type="range" min="0" max="100" step="1"
              value={pullProgress}
              onChange={(e) => setPullProgress(Number(e.target.value))}
              className="w-full h-4 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="bg-white p-3 rounded shadow-sm border border-slate-200 flex flex-col justify-center">
                <div className="text-xs text-slate-500">所需施力</div>
                <div className={`text-xl font-black ${isFixed ? 'text-blue-600' : 'text-green-600'}`}>{effortNeeded} g</div>
                <div className="text-[10px] font-bold mt-1 text-slate-400">{isFixed ? '(未省力)' : '(省一半的力)'}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-slate-200 flex flex-col justify-center">
                <div className="text-xs text-slate-500">施力方向</div>
                <div className="text-lg font-black text-slate-700">{isFixed ? '與物體相反' : '與物體相同'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   Section 3: Gears & Chains (齒輪與鏈條)
   ========================================= */
function GearSection() {
  const { unlocked } = useContext(ProgressContext);
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2 border-b pb-2">
        <Settings className="text-blue-500" /> 第 4 節:齒輪與鏈條 + 綜合應用
      </h2>

      {/* Part 4-1 */}
      <section id="part-4-1" className="scroll-mt-44 mb-10">
      <PartHeader number="4-1" title="齒輪與鏈條" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title="重點整理:互相咬合的齒輪" icon={<BookOpen className="text-green-500" />}>
          <div className="aspect-[2/1] mb-4 bg-orange-50 rounded-lg overflow-hidden border border-slate-200">
             <SvgMeshedGears />
          </div>
          <ul className="space-y-2 list-disc ml-5 text-slate-700">
            <li><strong>構造:</strong>邊緣有整齊齒狀突起的輪子。</li>
            <li><strong>轉動方向:</strong>互相咬合的兩個齒輪,轉動方向一定<strong className="text-red-500">相反</strong>。</li>
            <li><strong>轉動圈數:</strong>齒數越少(小齒輪),轉得圈數越<strong className="text-red-500">多(快)</strong>;齒數越多(大齒輪),轉得圈數越少(慢)。</li>
          </ul>
        </Card>

        <Card title="重點整理:齒輪與鏈條 (以腳踏車為例)" icon={<BookOpen className="text-green-500" />}>
          <div className="aspect-[2/1] mb-4 bg-blue-50 rounded-lg overflow-hidden border border-slate-200">
             <SvgChainGears />
          </div>
          <ul className="space-y-2 list-disc ml-5 text-slate-700">
            <li><strong>傳遞動力:</strong>透過鏈條連接不相鄰的齒輪,可以將動力傳送到遠處。</li>
            <li><strong>轉動方向:</strong>用鏈條連接的兩個齒輪,轉動方向<strong className="text-green-600">相同</strong>。</li>
            <li><strong>應用實例:</strong>腳踩踏板帶動前大齒輪,鏈條將動力傳到後小齒輪,後小齒輪再帶動後車輪。前大後小的配置讓我們能高速前進！</li>
          </ul>
        </Card>
      </div>

      <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2 border-b pb-2 mt-8">
        <Lightbulb className="text-amber-500" /> 生活中的傳動機械應用
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ApplicationCard
          type="齒輪直接咬合"
          condition="改變轉向、調整轉速"
          svg={<SvgClockGears />}
          desc="許多精密機械內部都充滿了互相咬合的齒輪,透過不同大小齒輪的搭配,可以精準控制時針、分針、秒針的轉動速度。"
          color="orange"
        />
        <ApplicationCard
          type="齒輪與鏈條傳動"
          condition="同向轉動、遠距離傳力"
          svg={<SvgEscalator />}
          desc="百貨公司電扶梯的馬達在上方,透過長長的鏈條連接下方齒輪,帶動整排踏階以同樣的方向和速度循環運轉。"
          color="blue"
        />
      </div>

      <MiniQuiz partId="4-1" nextPartId="4-2" />
      </section>

      {/* Part 4-2 */}
      {unlocked['4-1'] ? (
      <section id="part-4-2" className="scroll-mt-44 mb-10">
      <PartHeader number="4-2" title="齒輪實驗室" />
      <GearLab />
      <MiniQuiz partId="4-2" nextPartId="4-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="4-2" title="齒輪實驗室" requiresPartId="4-1" />
      )}

      {/* Part 4-3 */}
      {unlocked['4-2'] ? (
      <section id="part-4-3" className="scroll-mt-44 mb-10">
      <PartHeader number="4-3" title="綜合總整理" />
      <SynthesisBlock />
      <MiniQuiz partId="4-3" />
      </section>
      ) : (
        <LockedPlaceholder partId="4-3" title="綜合總整理" requiresPartId="4-2" />
      )}
    </div>
  );
}

function SynthesisBlock() {
  return (
    <div className="mt-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-blue-100 p-4 border-b border-blue-200">
        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
          <Wrench className="w-6 h-6" /> 綜合應用:四大簡單機械總整理
        </h3>
      </div>
      <div className="p-6">
        <p className="mb-6 text-slate-700 text-base leading-relaxed">
          四節課我們認識了 <strong>槓桿、輪軸、滑輪、齒輪與鏈條</strong> 四大簡單機械。把它們放在一起比較,就能看出每一種機械的特長與限制!
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 border-b border-slate-200 font-bold">機械</th>
                <th className="p-3 border-b border-slate-200 font-bold">主要功能</th>
                <th className="p-3 border-b border-slate-200 font-bold">省力嗎？</th>
                <th className="p-3 border-b border-slate-200 font-bold">改變方向？</th>
                <th className="p-3 border-b border-slate-200 font-bold">生活實例</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 border-b border-slate-100 font-black text-amber-700">槓桿</td>
                <td className="p-3 border-b border-slate-100">撐起或移動重物</td>
                <td className="p-3 border-b border-slate-100">視類型(省力/費力/等臂)</td>
                <td className="p-3 border-b border-slate-100">部分可改變</td>
                <td className="p-3 border-b border-slate-100">開瓶器、鑷子、翹翹板</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 border-b border-slate-100 font-black text-green-700">輪軸</td>
                <td className="p-3 border-b border-slate-100">旋轉省力</td>
                <td className="p-3 border-b border-slate-100">施力在輪 ⇒ 省力</td>
                <td className="p-3 border-b border-slate-100">否</td>
                <td className="p-3 border-b border-slate-100">方向盤、螺絲起子、門把</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 border-b border-slate-100 font-black text-blue-700">定滑輪</td>
                <td className="p-3 border-b border-slate-100">改變施力方向</td>
                <td className="p-3 border-b border-slate-100">否</td>
                <td className="p-3 border-b border-slate-100">是 (與物體相反)</td>
                <td className="p-3 border-b border-slate-100">升旗桿、窗簾</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 border-b border-slate-100 font-black text-emerald-700">動滑輪</td>
                <td className="p-3 border-b border-slate-100">省力拉重物</td>
                <td className="p-3 border-b border-slate-100">省一半的力</td>
                <td className="p-3 border-b border-slate-100">否 (與物體同向)</td>
                <td className="p-3 border-b border-slate-100">起重機、吊掛系統</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 border-b border-slate-100 font-black text-red-700">齒輪/鏈條</td>
                <td className="p-3 border-b border-slate-100">傳遞動力、調整轉速</td>
                <td className="p-3 border-b border-slate-100">視齒數比</td>
                <td className="p-3 border-b border-slate-100">咬合相反 / 鏈條相同</td>
                <td className="p-3 border-b border-slate-100">時鐘、腳踏車、電扶梯</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-amber-50 p-4 rounded-lg border border-amber-300 text-amber-900">
          <Lightbulb className="inline-block w-5 h-5 text-amber-600 mr-1 -mt-1" />
          <strong>核心觀念—「功不變」:</strong>所有簡單機械都遵守同一條規則—— 省力的代價是<strong>要拉得更遠</strong>;想拉得快、拉得輕,就要花<strong>更大的力氣</strong>。世界上沒有「又省力又省距離」的免費午餐!
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <strong className="text-blue-800">🔍 觀察任務</strong>
            <p className="text-slate-700 mt-1">回家找一找,廚房、玩具、文具裡有哪些簡單機械?把它畫下來!</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <strong className="text-green-800">🧠 思考挑戰</strong>
            <p className="text-slate-700 mt-1">為什麼腳踏車要「前大齒輪、後小齒輪」?換成相反會怎樣?</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <strong className="text-purple-800">🔧 動手創造</strong>
            <p className="text-slate-700 mt-1">用紙杯、吸管、繩子,做一個能拉起鉛筆盒的小滑輪!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GearLab() {
  const [mode, setMode] = useState('meshed');
  const [speed, setSpeed] = useState(0);

  const isSpinning = speed !== 0;
  const isCW = speed > 0;
  const absSpeed = Math.abs(speed);

  const durationLeft = isSpinning ? Math.max(0.5, 10 - (absSpeed / 100) * 9.5) : 0;
  const durationRight = isSpinning ? durationLeft / 2 : 0;

  const getSpinClass = (cw, duration) => {
    if (!isSpinning) return '';
    const name = cw ? 'animate-[spin_linear_infinite]' : 'animate-[spin_linear_infinite_reverse]';
    return name;
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
        <Gamepad2 className="text-purple-500" /> 物理互動實驗室:推動齒輪
      </h3>
      <p className="text-slate-600 mb-6 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        📝 <strong>實驗任務:</strong>請左右拖曳下方的<strong>「動力輸出」滑桿</strong>來轉動大齒輪。觀察連接方式不同時,右側小齒輪的轉向與轉速！
      </p>

      <div className="flex flex-col md:flex-row justify-center items-center gap-8 bg-white p-6 rounded-xl shadow-inner border border-slate-100 mb-6">

        <div className="relative flex items-center justify-center h-64 w-full max-w-lg bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          {mode === 'chained' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[90px] border-[8px] border-slate-700 rounded-full opacity-30 z-0"></div>
          )}

          <div className="flex items-center gap-2 z-10">
            <Settings
              className={`w-32 h-32 text-blue-500 ${getSpinClass(isCW, durationLeft)}`}
              style={isSpinning ? { animationDuration: `${durationLeft}s` } : {}}
            />

            <div className={`${mode === 'meshed' ? '-ml-7' : 'ml-14'}`}>
              <Settings
                className={`w-20 h-20 text-green-500 ${getSpinClass(mode === 'meshed' ? !isCW : isCW, durationRight)}`}
                style={isSpinning ? { animationDuration: `${durationRight}s` } : {}}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full md:w-1/2">
          <div>
            <span className="block text-sm font-bold text-slate-500 mb-2">步驟 1:選擇連接方式</span>
            <div className="flex gap-2">
              <button onClick={() => setMode('meshed')} className={`flex-1 py-3 rounded font-bold transition-all ${mode === 'meshed' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 hover:bg-slate-300'}`}>互相咬合</button>
              <button onClick={() => setMode('chained')} className={`flex-1 py-3 rounded font-bold transition-all ${mode === 'chained' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 hover:bg-slate-300'}`}>鏈條連接</button>
            </div>
          </div>

          <div className="bg-slate-100 p-5 rounded-lg border border-slate-300">
            <span className="block text-sm font-bold text-slate-700 mb-4 text-center">步驟 2:動力輸出 (控制轉速與方向)</span>
            <input
              type="range" min="-100" max="100" step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full h-4 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-4"
            />
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><RotateCcw className="w-4 h-4"/> 逆時針轉</span>
              <span className="text-sm">停止</span>
              <span className="flex items-center gap-1">順時針轉 <RotateCw className="w-4 h-4"/></span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-900 font-medium">
        觀察結果:當兩齒輪 <strong className="text-blue-700">{mode === 'meshed' ? '互相咬合' : '用鏈條連接'}</strong> 時,轉動方向會 <strong className="text-red-600">{mode === 'meshed' ? '相反' : '相同'}</strong>！
        而且綠色小齒輪因為齒數少,不管你怎麼轉,它都轉得比大齒輪<strong className="text-red-600">快</strong>喔！
      </div>
    </div>
  );
}

/* =========================================
   Section 4: Quiz (總測驗)
   ========================================= */
function QuizSection() {
  const questions = [
    {
      q: '剛剛在槓桿實驗室中,如果左邊的抗力不動,我們把右邊拉彈簧秤的手「往外移」(施力臂變長),我們需要的力量會如何變化？',
      opts: ['變大', '變小', '不變'],
      ans: '變小'
    },
    {
      q: '在輪軸實驗室中,要讓 100g 的重物被拉起,手拉哪邊的繩子會比較「省力」？',
      opts: ['拉大圓 (輪) 上的繩子', '拉小圓 (軸) 上的繩子', '都一樣'],
      ans: '拉大圓 (輪) 上的繩子'
    },
    {
      q: '在滑輪實驗室中,哪一種滑輪「不能省力」,但是可以「改變施力的方向」？',
      opts: ['動滑輪', '定滑輪', '都可以'],
      ans: '定滑輪'
    },
    {
      q: '在滑輪實驗室中,使用「動滑輪」拉起重物時,你的手是往哪個方向拉的？',
      opts: ['往下 (與物體相反)', '往上 (與物體相同)', '往旁邊'],
      ans: '往上 (與物體相同)'
    },
    {
      q: '在齒輪實驗室中,大齒輪和小齒輪如果「互相咬合」,大齒輪順時針轉動時,小齒輪會怎麼轉？',
      opts: ['順時針轉動', '逆時針轉動', '不會轉動'],
      ans: '逆時針轉動'
    }
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);

  const handleAnswer = (opt) => {
    setSelectedOpt(opt);
    if (opt === questions[currentQ].ans) {
      setScore(score + 100 / questions.length);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setShowResult(true);
      }
    }, 1000);
  };

  const restart = () => {
    setCurrentQ(0);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <h2 className="text-3xl font-bold text-blue-800 mb-4">測驗結束！</h2>
        <div className="text-6xl font-black text-orange-500 mb-6">{Math.round(score)} 分</div>
        <p className="text-lg text-slate-600 mb-8">
          {score === 100 ? '太棒了！你的觀察力超強,是簡單機械大師！🌟' :
           score >= 60 ? '表現不錯喔！如果有忘記的,再去虛擬實驗室拉拉看滑桿吧！📚' :
           '沒關係,物理就是要多動手做！去虛擬實驗室多玩幾次,一定會懂的！💪'}
        </p>
        <button onClick={restart} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 shadow-lg transition-transform hover:scale-105">
          再測驗一次
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-800">單元總測驗</h2>
        <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm font-bold">
          第 {currentQ + 1} / {questions.length} 題
        </span>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h3 className="text-xl font-medium text-slate-800 mb-8 leading-relaxed">
          {questions[currentQ].q}
        </h3>

        <div className="space-y-4">
          {questions[currentQ].opts.map((opt) => {
            const isSelected = selectedOpt === opt;
            const isCorrect = opt === questions[currentQ].ans;

            let btnClass = "w-full text-left px-6 py-4 rounded-xl border-2 font-medium transition-all ";

            if (!selectedOpt) {
              btnClass += "border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700";
            } else if (isSelected && isCorrect) {
              btnClass += "border-green-500 bg-green-50 text-green-700";
            } else if (isSelected && !isCorrect) {
              btnClass += "border-red-500 bg-red-50 text-red-700";
            } else if (!isSelected && isCorrect) {
              btnClass += "border-green-500 bg-green-50 text-green-700";
            } else {
              btnClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
            }

            return (
              <button
                key={opt}
                onClick={() => !selectedOpt && handleAnswer(opt)}
                disabled={selectedOpt !== null}
                className={btnClass}
              >
                {opt}
                {selectedOpt && isCorrect && <CheckCircle2 className="inline float-right text-green-500" />}
                {selectedOpt === opt && !isCorrect && <XCircle className="inline float-right text-red-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   Helper Components
   ========================================= */
function Card({ title, icon, children }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
        {icon} {title}
      </h3>
      <div className="text-slate-700 w-full">
        {children}
      </div>
    </div>
  );
}

function ApplicationCard({ type, condition, svg, desc, color }) {
  const colorMap = {
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
    orange: "border-orange-200 bg-orange-50",
  };

  const textMap = {
    green: "text-green-800",
    red: "text-red-800",
    blue: "text-blue-800",
    orange: "text-orange-800",
  };

  return (
    <div className={`rounded-xl border p-5 h-full flex flex-col ${colorMap[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <h4 className={`text-xl font-black ${textMap[color]}`}>{type}</h4>
        <span className="text-sm font-bold bg-white px-3 py-1 rounded shadow-sm text-slate-600">{condition}</span>
      </div>
      <div className="h-48 mb-4 bg-white/80 border border-slate-300/50 rounded-xl overflow-hidden relative flex items-center justify-center p-2 shadow-inner">
         {svg}
      </div>
      <p className="text-base text-slate-700 leading-relaxed flex-grow font-medium">{desc}</p>
    </div>
  );
}
