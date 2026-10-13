import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  HeartPulse,
  History,
  Info,
  Menu,
  MessageCircle,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const quickQuestions = [
  "How can I get better sleep?",
  "What does a tension headache feel like?",
  "When should I see a doctor for a cough?",
];

const initialSaved = [
  "How can I get better sleep?",
  "What does a tension headache feel like?",
];

const sourceLinks = [
  { name: "National Institutes of Health", detail: "Evidence & research", href: "https://www.nih.gov/" },
  { name: "Mayo Clinic", detail: "Patient-friendly guidance", href: "https://www.mayoclinic.org/" },
  { name: "CDC", detail: "Public health recommendations", href: "https://www.cdc.gov/" },
];

function LogoMark() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0f766e] text-white shadow-[0_8px_20px_rgba(15,118,110,0.18)]">
      <MessageCircle size={21} strokeWidth={2.4} />
      <span className="absolute bottom-[8px] right-[7px] flex h-[11px] w-[11px] items-center justify-center rounded-full bg-[#f28b72] ring-2 ring-[#0f766e]">
        <Check size={7} strokeWidth={3.5} />
      </span>
    </div>
  );
}

function TrustPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#dce7df] bg-white/70 px-3 py-2 text-xs font-medium text-[#486560] shadow-[0_3px_14px_rgba(40,75,67,0.04)]">
      <span className="text-[#0f766e]">{icon}</span>
      {children}
    </div>
  );
}

function Index() {
  const [question, setQuestion] = useState("");
  const [activeView, setActiveView] = useState<"ask" | "saved">("ask");
  const [answerVisible, setAnswerVisible] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<string[]>(initialSaved);
  const [menuOpen, setMenuOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedQuestions = window.localStorage.getItem("clarity-health-saved");
    if (storedQuestions) setSavedQuestions(JSON.parse(storedQuestions));
  }, []);

  useEffect(() => {
    if (answerVisible) answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [answerVisible]);

  const currentQuestionSaved = savedQuestions.includes(question.trim());
  const questionKind = useMemo(() => {
    const normalized = question.toLowerCase();
    if (normalized.includes("sleep")) return "sleep";
    if (normalized.includes("headache")) return "headache";
    if (normalized.includes("cough")) return "cough";
    return "general";
  }, [question]);

  const saveQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const next = currentQuestionSaved
      ? savedQuestions.filter((savedQuestion) => savedQuestion !== trimmed)
      : [trimmed, ...savedQuestions];
    setSavedQuestions(next);
    window.localStorage.setItem("clarity-health-saved", JSON.stringify(next));
  };

  const askQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;
    setActiveView("ask");
    setAnswerVisible(true);
  };

  const chooseQuestion = (prompt: string) => {
    setQuestion(prompt);
    setAnswerVisible(false);
    setActiveView("ask");
  };

  const clearQuestion = () => {
    setQuestion("");
    setAnswerVisible(false);
  };

  const answerCopy = {
    sleep: {
      title: "Small changes can make sleep feel easier",
      summary: "Most adults do best with 7–9 hours of sleep, but quality matters as much as the number. Start with one or two changes you can repeat consistently rather than trying to fix everything at once.",
      points: [
        "Keep your wake-up time consistent, even on weekends. This helps your body clock find a steadier rhythm.",
        "Give yourself a 30–60 minute wind-down with dimmer light and a screen-free activity you enjoy.",
        "If you are awake for about 20 minutes, try a quiet activity in low light and return to bed when sleepy.",
      ],
      next: "If sleep problems happen at least three nights a week for three months, or you snore loudly and wake gasping, talk with a clinician.",
    },
    headache: {
      title: "The pattern matters more than the label",
      summary: "Tension-type headaches often feel like steady pressure or a band around the head, and may come with tight neck or shoulder muscles. A description alone cannot confirm the cause.",
      points: [
        "Note when the headache starts, how long it lasts, and what you were doing beforehand.",
        "Regular meals, water, sleep, and gentle neck or shoulder movement may help some people.",
        "Avoid taking pain medicine more often than the label recommends; frequent use can cause rebound headaches.",
      ],
      next: "Get urgent help for a sudden severe headache, a headache after a head injury, or one with weakness, confusion, fainting, or vision changes.",
    },
    cough: {
      title: "A cough is a signal, not a diagnosis",
      summary: "Coughs can happen with a cold, allergies, reflux, asthma, or other conditions. The timeline and accompanying symptoms are the most useful clues.",
      points: [
        "Track how long it has lasted and whether it is dry, brings up mucus, or is worse at a particular time.",
        "Rest, fluids, and avoiding smoke or strong fragrances can be reasonable comfort measures for many mild coughs.",
        "Check with a pharmacist before combining over-the-counter cough products, especially if you take other medicines.",
      ],
      next: "Contact a clinician for a cough lasting more than three weeks, or sooner for breathing trouble, chest pain, coughing blood, or a high fever.",
    },
    general: {
      title: "A thoughtful answer starts with the full picture",
      summary: "A single symptom rarely points to one cause. The most helpful next step is to notice the pattern, understand what is safe to try at home, and know which changes deserve medical attention.",
      points: [
        "Write down when it started, what makes it better or worse, and any new medicines or health changes.",
        "Use trusted sources to understand possibilities, but avoid using an online answer as a diagnosis.",
        "Bring your notes and questions to a clinician or pharmacist if the concern persists or interferes with daily life.",
      ],
      next: "Seek urgent care for severe or rapidly worsening symptoms, trouble breathing, chest pain, fainting, sudden weakness, or confusion.",
    },
  }[questionKind];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f5ef] text-[#183d3a]">
      <header className="sticky top-0 z-30 border-b border-[#e3e8df] bg-[#f7f5ef]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <button onClick={clearQuestion} className="flex items-center gap-3 text-left" aria-label="Clarity Health home">
            <LogoMark />
            <span className="font-serif text-[21px] font-semibold tracking-[-0.03em] text-[#173e3a]">Clarity<span className="text-[#e2755e]">.</span></span>
          </button>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <button onClick={() => { setActiveView("ask"); setAnswerVisible(false); }} className={`text-sm font-medium transition-colors ${activeView === "ask" ? "text-[#0f766e]" : "text-[#66807a] hover:text-[#173e3a]"}`}>Ask a question</button>
            <button onClick={() => setActiveView("saved")} className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeView === "saved" ? "text-[#0f766e]" : "text-[#66807a] hover:text-[#173e3a]"}`}><Bookmark size={15} /> Your library</button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="relative flex items-center gap-2 rounded-full border border-[#dce7df] bg-white/80 px-3.5 py-2 text-sm font-semibold text-[#35615a] transition hover:border-[#9cc2b7] hover:bg-white">
              <UserRound size={16} /> Sign in
              {menuOpen && <span className="absolute right-0 top-12 w-56 rounded-2xl border border-[#dce7df] bg-white p-4 text-left text-xs font-normal text-[#58716c] shadow-[0_16px_40px_rgba(40,75,67,0.13)]"><strong className="mb-1 block text-sm text-[#183d3a]">Keep your answers close</strong>Create an optional account to sync your saved health notes across devices.<span className="mt-3 block font-semibold text-[#0f766e]">Coming soon</span></span>}
            </button>
          </nav>
          <button className="rounded-xl p-2 text-[#39635d] md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu size={22} /></button>
        </div>
        {menuOpen && <div className="border-t border-[#e3e8df] bg-white px-5 py-3 md:hidden"><div className="mx-auto flex max-w-[1180px] gap-5 text-sm font-medium text-[#4c6b65]"><button onClick={() => { setActiveView("ask"); setMenuOpen(false); }}>Ask a question</button><button onClick={() => { setActiveView("saved"); setMenuOpen(false); }}>Your library</button></div></div>}
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-8">
        {activeView === "ask" ? (
          <>
            <section className="grid items-center gap-10 pb-8 pt-12 md:grid-cols-[1.04fr_0.96fr] md:gap-16 md:pb-14 md:pt-[72px]">
              <div className="animate-[fadeUp_0.55s_ease-out]">
                <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]"><span className="h-2 w-2 rounded-full bg-[#f28b72]" /> Health answers, made human</div>
                <h1 className="max-w-[590px] font-serif text-[49px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#173e3a] sm:text-[65px]">A clearer answer<br /><em className="font-normal text-[#0f766e]">starts here.</em></h1>
                <p className="mt-6 max-w-[510px] text-[17px] leading-8 text-[#64807a]">Thoughtful, research-backed guidance for the health questions on your mind. No jargon. No judgment. Just a useful place to begin.</p>
                <div className="mt-7 flex flex-wrap gap-2.5"><TrustPill icon={<ShieldCheck size={15} />}>Sources you can trust</TrustPill><TrustPill icon={<Stethoscope size={15} />}>Always clinician-aware</TrustPill></div>
              </div>
              <div className="relative min-h-[320px] animate-[fadeUp_0.7s_ease-out] sm:min-h-[380px]">
                <div className="absolute inset-x-0 bottom-0 top-5 overflow-hidden rounded-[30px] bg-[#dbe9df] shadow-[0_20px_50px_rgba(50,83,73,0.12)]"><img src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1100&q=85" alt="Person reading health information in a bright, calm space" className="h-full w-full object-cover object-center mix-blend-multiply opacity-80" /><div className="absolute inset-0 bg-[#d6e5d9]/25" /></div>
                <div className="absolute left-[-8px] top-0 max-w-[255px] rounded-[20px] border border-white/70 bg-[#fffdf8]/95 p-4 shadow-[0_15px_35px_rgba(50,83,73,0.14)] sm:left-[-20px]"><div className="mb-3 flex items-center gap-2 text-[#0f766e]"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#dceddf]"><BookOpen size={16} /></span><span className="text-[10px] font-bold uppercase tracking-[0.16em]">Built on evidence</span></div><p className="font-serif text-[17px] leading-6 text-[#234b46]">“Good information should help you feel more prepared, not more worried.”</p></div>
                <div className="absolute bottom-5 right-[-5px] rounded-2xl border border-white/80 bg-[#0f766e] px-4 py-3 text-white shadow-[0_12px_28px_rgba(15,118,110,0.25)] sm:right-[-18px]"><div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={15} className="text-[#f7bd9e]" /> Clearer next steps</div></div>
              </div>
            </section>

            <section className="scroll-mt-24" aria-labelledby="ask-title">
              <form onSubmit={askQuestion} className="relative overflow-hidden rounded-[28px] border border-[#d8e4dc] bg-white p-5 shadow-[0_14px_40px_rgba(40,75,67,0.07)] sm:p-7">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[70px] bg-[#edf5eb]" />
                <div className="relative"><div className="mb-2 flex items-center gap-2 text-[#0f766e]"><PenLine size={17} /><span className="text-[11px] font-bold uppercase tracking-[0.16em]">Start with what you’re wondering</span></div><h2 id="ask-title" className="font-serif text-[27px] font-semibold tracking-[-0.025em] text-[#183d3a]">What’s on your mind today?</h2><p className="mt-1 text-sm text-[#78918b]">Ask about a symptom, a condition, or a health decision.</p>
                  <div className="relative mt-5"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Why do I keep waking up tired?" className="min-h-[124px] resize-none rounded-[18px] border-[#d6e4dc] bg-[#fbfcf9] px-4 py-4 text-[16px] leading-7 text-[#224944] placeholder:text-[#a7b9b2] focus-visible:ring-[#0f766e]" aria-label="Your health question" /><span className="absolute bottom-3 right-3 text-[11px] text-[#a3b4ad]">{question.length}/500</span></div>
                  <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex flex-wrap gap-2">{quickQuestions.map((prompt) => <button type="button" key={prompt} onClick={() => chooseQuestion(prompt)} className="rounded-full border border-[#dce7df] bg-[#fbfcf9] px-3 py-1.5 text-xs font-medium text-[#5e7d75] transition hover:border-[#8cbcaf] hover:bg-[#eff7f0] hover:text-[#0f766e]">{prompt}</button>)}</div><Button type="submit" disabled={!question.trim()} className="h-11 shrink-0 rounded-full bg-[#0f766e] px-5 font-semibold text-white shadow-[0_8px_16px_rgba(15,118,110,0.16)] hover:bg-[#0a655f] disabled:bg-[#b8cac3]"><Search size={16} className="mr-2" />Find my answer</Button></div>
                </div>
              </form>
            </section>

            {answerVisible ? (
              <section ref={answerRef} className="mt-8 scroll-mt-24 animate-[fadeUp_0.45s_ease-out]" aria-labelledby="answer-title">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dceddf]"><Check size={13} strokeWidth={3} /></span> Your Clarity answer</div><button type="button" onClick={saveQuestion} className="flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold text-[#53746d] transition hover:bg-white hover:text-[#0f766e] sm:self-auto">{currentQuestionSaved ? <BookmarkCheck size={15} className="text-[#0f766e]" /> : <Bookmark size={15} />} {currentQuestionSaved ? "Saved to your library" : "Save for later"}</button></div>
                <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
                  <article className="overflow-hidden rounded-[26px] border border-[#d8e4dc] bg-white shadow-[0_14px_40px_rgba(40,75,67,0.06)]"><div className="border-b border-[#e6eee7] bg-[#eff7f0] p-6 sm:p-8"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge className="rounded-full border-0 bg-[#d7ecdf] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#0f766e]">A place to start</Badge><span className="text-xs text-[#759089]">Research reviewed · 5 min read</span></div><p className="mb-2 text-sm font-medium italic text-[#76908a]">“{question.trim()}”</p><h2 id="answer-title" className="max-w-[650px] font-serif text-[32px] font-semibold leading-tight tracking-[-0.035em] text-[#183d3a]">{answerCopy.title}</h2><p className="mt-4 max-w-[700px] text-[16px] leading-7 text-[#4f7068]">{answerCopy.summary}</p></div><div className="p-6 sm:p-8"><h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-[#183d3a]"><FileText size={17} className="text-[#0f766e]" /> Helpful things to know</h3><ul className="space-y-4">{answerCopy.points.map((point) => <li key={point} className="flex gap-3 text-[15px] leading-7 text-[#52726b]"><span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f3e9] text-[#0f766e]"><Check size={12} strokeWidth={3} /></span>{point}</li>)}</ul><div className="mt-7 rounded-2xl border border-[#f3d7c9] bg-[#fff6f0] p-4"><div className="flex gap-3"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#d66e54]" /><div><h4 className="text-sm font-bold text-[#8d4939]">When to get more help</h4><p className="mt-1 text-sm leading-6 text-[#885e55]">{answerCopy.next}</p></div></div></div></div></article>
                  <aside className="space-y-5"><div className="rounded-[23px] border border-[#d8e4dc] bg-white p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e7f2e8] text-[#0f766e]"><Stethoscope size={16} /></span><h3 className="text-sm font-bold text-[#214b45]">Questions for a clinician</h3></div><p className="text-sm leading-6 text-[#68837c]">“What else could cause this pattern?”</p><p className="mt-3 text-sm leading-6 text-[#68837c]">“What changes should make me follow up?”</p><button type="button" className="mt-4 flex items-center gap-1 text-xs font-bold text-[#0f766e] hover:underline">See conversation guide <ChevronRight size={14} /></button></div><div className="rounded-[23px] border border-[#d8e4dc] bg-[#fbfcf9] p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen size={17} className="text-[#0f766e]" /><h3 className="text-sm font-bold text-[#214b45]">Sources</h3></div><span className="text-[10px] font-bold uppercase tracking-wider text-[#91a69f]">3 reviewed</span></div><div className="space-y-3">{sourceLinks.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.name} className="group flex items-start justify-between gap-2"><span><span className="block text-xs font-semibold text-[#446a62] group-hover:text-[#0f766e]">{source.name}</span><span className="block text-[11px] text-[#91a69f]">{source.detail}</span></span><ExternalLink size={13} className="mt-0.5 shrink-0 text-[#8ba69e]" /></a>)}</div></div></aside>
                </div>
                <div className="mt-6 flex items-start gap-2 px-1 text-xs leading-5 text-[#8ba09a]"><Info size={14} className="mt-0.5 shrink-0" />Clarity provides general educational information, not a diagnosis or personalized medical advice. If you’re worried about a symptom, a qualified healthcare professional can help.</div>
              </section>
            ) : (
              <section className="mt-10 grid gap-5 pb-8 md:grid-cols-[1.15fr_0.85fr]">
                <div className="relative overflow-hidden rounded-[26px] bg-[#e9f2e7] p-6 sm:p-8"><div className="relative z-10 max-w-[430px]"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0f766e] shadow-sm"><HeartPulse size={20} /></div><h2 className="font-serif text-[27px] font-semibold tracking-[-0.03em] text-[#234b46]">Make your next health conversation easier.</h2><p className="mt-3 text-sm leading-6 text-[#638078]">Understand the basics, spot what matters, and go into your next appointment with better questions.</p><button onClick={() => chooseQuestion("What should I ask my doctor about a new symptom?")} className="mt-5 flex items-center gap-2 text-sm font-bold text-[#0f766e] hover:underline">See an example answer <ArrowUpRight size={15} /></button></div><div className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full border-[22px] border-[#d4e7d5]" /><div className="absolute -right-4 top-8 h-20 w-20 rounded-full bg-[#f5cfbb]/60" /></div>
                <div className="rounded-[26px] border border-[#d8e4dc] bg-white p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-serif text-[23px] font-semibold text-[#234b46]">Popular starting points</h2><p className="mt-1 text-xs text-[#829991]">Questions people ask often</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7f2] text-[#0f766e]"><MessageCircle size={17} /></span></div><div className="space-y-2">{quickQuestions.map((prompt, index) => <button key={prompt} onClick={() => chooseQuestion(prompt)} className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f1f7f1]"><span className="flex items-center gap-3 text-sm text-[#56766e]"><span className="font-serif text-sm italic text-[#b0c1b8]">0{index + 1}</span>{prompt}</span><ChevronRight size={15} className="text-[#aac0b7] transition group-hover:translate-x-1 group-hover:text-[#0f766e]" /></button>)}</div></div>
              </section>
            )}
          </>
        ) : (
          <section className="pb-10 pt-12 md:pt-16"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]"><History size={15} /> Your private library</div><h1 className="font-serif text-[44px] font-semibold tracking-[-0.05em] text-[#173e3a]">Saved for later<span className="text-[#e2755e]">.</span></h1><p className="mt-3 text-[16px] text-[#718b84]">A quiet place for the questions you want to revisit.</p></div><button onClick={() => { setActiveView("ask"); setAnswerVisible(false); }} className="flex items-center gap-2 self-start rounded-full bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a655f]"><PenLine size={15} /> Ask something new</button></div>{savedQuestions.length ? <div className="grid gap-4 md:grid-cols-2">{savedQuestions.map((savedQuestion, index) => <div key={savedQuestion} className="group rounded-[23px] border border-[#d8e4dc] bg-white p-5 shadow-[0_8px_25px_rgba(40,75,67,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(40,75,67,0.08)]"><div className="mb-6 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8aa29a]"><Clock3 size={14} /> Saved question 0{index + 1}</span><button onClick={() => { setQuestion(savedQuestion); setSavedQuestions(savedQuestions.filter((item) => item !== savedQuestion)); }} className="rounded-full p-1.5 text-[#9bb0aa] opacity-0 transition hover:bg-[#fff2ed] hover:text-[#d66e54] group-hover:opacity-100" aria-label={`Remove ${savedQuestion}`}><X size={15} /></button></div><p className="font-serif text-[22px] font-semibold leading-snug text-[#234b46]">{savedQuestion}</p><button onClick={() => { setQuestion(savedQuestion); setActiveView("ask"); setAnswerVisible(true); }} className="mt-5 flex items-center gap-1 text-xs font-bold text-[#0f766e]">Open answer <ArrowUpRight size={14} /></button></div>)}</div> : <div className="rounded-[26px] border border-dashed border-[#c9dcd0] bg-white/50 p-12 text-center"><Bookmark size={26} className="mx-auto text-[#8aada0]" /><p className="mt-4 font-serif text-2xl font-semibold text-[#315951]">Your library is waiting.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#819a91]">Save an answer while you explore and it will show up here in this browser.</p></div>}<div className="mt-8 flex items-start gap-2 text-xs leading-5 text-[#8ba09a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0f766e]" />Your saved questions stay in this browser. Create an account later if you’d like to sync them across devices.</div></section>
        )}
      </main>

      <footer className="border-t border-[#e3e8df] bg-[#f1f2eb] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-4 text-xs text-[#819991] sm:flex-row sm:items-center"><div className="flex items-center gap-2 font-semibold text-[#54746c]"><LogoMark /><span>Clarity Health</span></div><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><span>Educational information, not medical advice</span><a href="https://www.cdc.gov/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0f766e]">Our sources <ExternalLink size={12} /></a></div></div></footer>
    </div>
  );
}

export default Index;
