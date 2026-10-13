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
  LocateFixed,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquareText,
  PenLine,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
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
import { supabase } from "@/integrations/supabase/client";

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

type QuestionKind = "sleep" | "headache" | "cough" | "fever" | "digestive" | "stress" | "skin" | "medication" | "general";
type FollowUp = { question: string; answer: string };
type CommunityReply = { id: string; question_id: string; display_name: string; body: string; created_at: string };
type CommunityQuestion = { id: string; display_name: string; title: string; body: string; topic: string; created_at: string; replies: CommunityReply[] };
type CareCoordinates = { latitude: number; longitude: number; label: string };
type CarePlace = { id: string; name: string; latitude: number; longitude: number; address: string; phone: string; distanceKm: number };
type OverpassElement = { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

const followUpGuidance: Record<QuestionKind, FollowUp[]> = {
  sleep: [
    { question: "What can I try tonight?", answer: "Choose one small reset: keep your wake time tomorrow, dim the lights for the last hour, and leave the bed for a quiet activity if you are awake and frustrated. Consistency over several nights matters more than one perfect night." },
    { question: "When should I get checked?", answer: "Make an appointment if this happens at least three nights a week for three months, affects driving or work, or comes with loud snoring, gasping, or uncomfortable leg sensations." },
  ],
  headache: [
    { question: "What details should I track?", answer: "Record the start time, location, pressure versus throbbing quality, severity, duration, sleep, meals, fluids, menstrual cycle if relevant, and any nausea, light sensitivity, weakness, or vision change." },
    { question: "When is a headache urgent?", answer: "Seek urgent help for a sudden severe headache, new weakness or numbness, confusion, fainting, a stiff neck with fever, vision loss, or a headache after a head injury." },
  ],
  cough: [
    { question: "What can soothe a mild cough?", answer: "Fluids, rest, avoiding smoke and strong fragrances, and honey for adults can help with comfort. Do not give honey to a child under one year, and check with a pharmacist before combining cough products." },
    { question: "How long is too long?", answer: "Contact a clinician if a cough lasts more than three weeks, keeps returning, or is disrupting sleep. Get help sooner for breathing difficulty, chest pain, coughing blood, or a high fever." },
  ],
  fever: [
    { question: "How should I monitor it?", answer: "Use the same reliable thermometer and method each time, note the reading and time, and focus on hydration and how the person feels. Age and other symptoms matter more than a single number." },
    { question: "What makes a fever urgent?", answer: "Get urgent help for confusion, a stiff neck, trouble breathing, a seizure, severe dehydration, or a rapidly worsening condition. For infants and pregnancy, use a lower threshold to call a clinician." },
  ],
  digestive: [
    { question: "How can I stay hydrated?", answer: "Take small, frequent sips. If vomiting or diarrhea continues, an oral rehydration solution can replace water and salts more reliably than plain water alone. Watch for very dark urine, dizziness, or inability to keep fluids down." },
    { question: "What should I tell a clinician?", answer: "Share when it started, stool or vomit changes, pain location, fever, recent food or travel, sick contacts, new medicines, pregnancy possibility, and whether you can keep fluids down." },
  ],
  stress: [
    { question: "What can I do in the next five minutes?", answer: "Put both feet on the floor, make your exhale a little longer than your inhale for five breaths, name five things you can see, and text someone you trust. If that feels worse, stop and choose a neutral activity instead." },
    { question: "When should I reach out?", answer: "Consider a clinician or therapist when worry is persistent, hard to control, causing panic, disrupting sleep, or changing work and relationships. If you may hurt yourself or cannot stay safe, seek urgent help now." },
  ],
  skin: [
    { question: "What should I photograph?", answer: "Take a dated photo in natural light with one wider view and one closer view. Note whether it is spreading, painful, warm, blistering, draining, or linked to a new medicine or product." },
    { question: "What skin changes are urgent?", answer: "Get urgent help for swelling of the lips or tongue, trouble breathing, skin peeling or blistering, or a rapidly spreading rash with fever or feeling very unwell." },
  ],
  medication: [
    { question: "What information do I need?", answer: "Have the exact name, strength, dose, timing, reason for taking it, start date, allergies, and a list of other medicines or supplements. A pharmacist can check interactions quickly." },
    { question: "What if I missed a dose?", answer: "Check the medication label or ask a pharmacist rather than doubling up. Some medicines have time-sensitive instructions, and prescribed medicines should not be stopped suddenly without guidance." },
  ],
  general: [
    { question: "What should I track next?", answer: "Write down when it started, what makes it better or worse, how it affects daily activities, any measured temperature or other readings, and every medicine or supplement you take." },
    { question: "How do I decide whether to call?", answer: "Call a clinician when symptoms persist, worsen, keep returning, or interfere with daily life. Seek urgent help for trouble breathing, chest pain, fainting, confusion, sudden weakness, or severe dehydration." },
  ],
};

function formatCommunityDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function distanceBetween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const earthRadiusKm = 6371;
  const latitudeDelta = (latitudeB - latitudeA) * Math.PI / 180;
  const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA * Math.PI / 180) * Math.cos(latitudeB * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPhoneHref(phone: string) {
  return phone.replace(/[^0-9+().#\-\s]/g, "");
}

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
  const [activeView, setActiveView] = useState<"ask" | "saved" | "community" | "care">("ask");
  const [answerVisible, setAnswerVisible] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<string[]>(initialSaved);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [buildOnOpen, setBuildOnOpen] = useState(false);
  const [buildOnDraft, setBuildOnDraft] = useState("");
  const [communityQuestions, setCommunityQuestions] = useState<CommunityQuestion[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState("");
  const [communityFormOpen, setCommunityFormOpen] = useState(false);
  const [communityName, setCommunityName] = useState("Anonymous");
  const [communityTitle, setCommunityTitle] = useState("");
  const [communityBody, setCommunityBody] = useState("");
  const [communityTopic, setCommunityTopic] = useState("General");
  const [replyName, setReplyName] = useState("Anonymous");
  const [replyBody, setReplyBody] = useState("");
  const [communitySubmitting, setCommunitySubmitting] = useState(false);
  const [careLocation, setCareLocation] = useState("");
  const [careCoordinates, setCareCoordinates] = useState<CareCoordinates | null>(null);
  const [carePlaces, setCarePlaces] = useState<CarePlace[]>([]);
  const [careLoading, setCareLoading] = useState(false);
  const [careError, setCareError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const buildOnRef = useRef<HTMLTextAreaElement>(null);

  const loadCommunity = async () => {
    setCommunityLoading(true);
    setCommunityError("");
    const { data: questionData, error: questionError } = await supabase
      .from("community_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (questionError) {
      setCommunityError("The community is taking a moment to load. Please try again.");
      setCommunityLoading(false);
      return;
    }

    const questionRows = (questionData ?? []) as Array<Omit<CommunityQuestion, "replies">>;
    const questionIds = questionRows.map((item) => item.id);
    let replyRows: CommunityReply[] = [];

    if (questionIds.length) {
      const { data: replyData, error: replyError } = await supabase
        .from("community_replies")
        .select("*")
        .in("question_id", questionIds)
        .order("created_at", { ascending: true });
      if (replyError) {
        setCommunityError("Questions loaded, but replies could not be loaded right now.");
      } else {
        replyRows = (replyData ?? []) as CommunityReply[];
      }
    }

    setCommunityQuestions(questionRows.map((item) => ({
      ...item,
      replies: replyRows.filter((reply) => reply.question_id === item.id),
    })));
    setCommunityLoading(false);
  };

  useEffect(() => {
    void loadCommunity();
  }, []);

  useEffect(() => {
    const storedQuestions = window.localStorage.getItem("clarity-health-saved");
    if (storedQuestions) setSavedQuestions(JSON.parse(storedQuestions));
  }, []);

  useEffect(() => {
    if (answerVisible) answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [answerVisible]);

  const currentQuestionSaved = savedQuestions.includes(question.trim());
  const questionKind = useMemo((): QuestionKind => {
    const normalized = question.toLowerCase();
    if (normalized.includes("sleep") || normalized.includes("insomnia")) return "sleep";
    if (normalized.includes("headache") || normalized.includes("migraine")) return "headache";
    if (normalized.includes("cough") || normalized.includes("phlegm")) return "cough";
    if (normalized.includes("fever") || normalized.includes("temperature")) return "fever";
    if (normalized.includes("stomach") || normalized.includes("nausea") || normalized.includes("diarrhea")) return "digestive";
    if (normalized.includes("anxiety") || normalized.includes("stress") || normalized.includes("panic")) return "stress";
    if (normalized.includes("rash") || normalized.includes("itch") || normalized.includes("skin")) return "skin";
    if (normalized.includes("medicine") || normalized.includes("medication") || normalized.includes("pill")) return "medication";
    return "general";
  }, [question]);

  const followUps = followUpGuidance[questionKind];

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
    setSelectedFollowUp(null);
    setBuildOnOpen(false);
    setBuildOnDraft("");
    setActiveView("ask");
    setAnswerVisible(true);
  };

  const chooseQuestion = (prompt: string) => {
    setQuestion(prompt);
    setSelectedFollowUp(null);
    setBuildOnOpen(false);
    setBuildOnDraft("");
    setAnswerVisible(false);
    setActiveView("ask");
  };

  const clearQuestion = () => {
    setQuestion("");
    setSelectedFollowUp(null);
    setBuildOnOpen(false);
    setBuildOnDraft("");
    setAnswerVisible(false);
  };

  const buildOnQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || !buildOnDraft.trim()) return;
    setQuestion(`${question.trim()} Follow-up: ${buildOnDraft.trim()}`);
    setBuildOnDraft("");
    setBuildOnOpen(false);
    setSelectedFollowUp(null);
    setAnswerVisible(true);
  };

  const submitCommunityQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!communityTitle.trim() || !communityBody.trim()) return;
    setCommunitySubmitting(true);
    setCommunityError("");
    const { data, error } = await supabase.from("community_questions").insert({
      display_name: communityName.trim() || "Anonymous",
      title: communityTitle.trim(),
      body: communityBody.trim(),
      topic: communityTopic,
    }).select("id").single();
    if (error) {
      setCommunityError("We couldn’t post that question. Please check the length and try again.");
    } else {
      setCommunityTitle("");
      setCommunityBody("");
      setCommunityFormOpen(false);
      await loadCommunity();
      if (data?.id) setSelectedCommunityId(data.id);
    }
    setCommunitySubmitting(false);
  };

  const submitCommunityReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCommunityId || !replyBody.trim()) return;
    setCommunitySubmitting(true);
    setCommunityError("");
    const { error } = await supabase.from("community_replies").insert({
      question_id: selectedCommunityId,
      display_name: replyName.trim() || "Anonymous",
      body: replyBody.trim(),
    });
    if (error) {
      setCommunityError("We couldn’t post that reply. Please check the length and try again.");
    } else {
      setReplyBody("");
      await loadCommunity();
    }
    setCommunitySubmitting(false);
  };

  const selectedCommunityQuestion = communityQuestions.find((item) => item.id === selectedCommunityId) ?? null;

  const loadNearbyCare = async (latitude: number, longitude: number, label: string) => {
    setCareLoading(true);
    setCareError("");
    setCareCoordinates({ latitude, longitude, label });
    const query = `[out:json][timeout:20];(nwr[\"amenity\"=\"doctors\"](around:8000,${latitude},${longitude});nwr[\"amenity\"=\"clinic\"](around:8000,${latitude},${longitude});nwr[\"healthcare\"=\"doctor\"](around:8000,${latitude},${longitude});nwr[\"healthcare\"=\"clinic\"](around:8000,${latitude},${longitude}););out center tags;`;
    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("care-search-failed");
      const payload = await response.json() as { elements?: OverpassElement[] };
      const seen = new Set<string>();
      const places = (payload.elements ?? []).map((item) => {
        const latitudeValue = item.lat ?? item.center?.lat;
        const longitudeValue = item.lon ?? item.center?.lon;
        if (latitudeValue === undefined || longitudeValue === undefined) return null;
        const tags = item.tags ?? {};
        const key = `${item.id}-${latitudeValue}-${longitudeValue}`;
        if (seen.has(key)) return null;
        seen.add(key);
        const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:postcode"]].filter(Boolean).join(" ") || "Address not listed";
        return {
          id: key,
          name: tags.name || tags["name:en"] || "Doctor office",
          latitude: latitudeValue,
          longitude: longitudeValue,
          address,
          phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "",
          distanceKm: distanceBetween(latitude, longitude, latitudeValue, longitudeValue),
        } satisfies CarePlace;
      }).filter((place): place is CarePlace => place !== null).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12);
      setCarePlaces(places);
      if (!places.length) setCareError("No nearby offices were listed in OpenStreetMap. Try searching a larger town or city.");
    } catch {
      setCarePlaces([]);
      setCareError("We couldn’t load nearby offices right now. You can still search the map directly.");
    } finally {
      setCareLoading(false);
    }
  };

  const findCareByLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!careLocation.trim()) return;
    setCareLoading(true);
    setCareError("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(careLocation.trim())}`);
      if (!response.ok) throw new Error("location-search-failed");
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      const result = results[0];
      if (!result) throw new Error("location-not-found");
      await loadNearbyCare(Number(result.lat), Number(result.lon), result.display_name.split(",").slice(0, 2).join(","));
    } catch {
      setCareLoading(false);
      setCareError("We couldn’t find that location. Try a city, ZIP code, or neighborhood.");
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setCareError("Location services are not available in this browser. Search for a city instead.");
      return;
    }
    setCareLoading(true);
    setCareError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void loadNearbyCare(coords.latitude, coords.longitude, "Your location"),
      () => {
        setCareLoading(false);
        setCareError("We couldn’t access your location. Search for a city or ZIP code instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const careMapUrl = careCoordinates ? (() => {
    const delta = 0.035;
    const { latitude, longitude } = careCoordinates;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  })() : "";

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
      consider: "How long has this been happening, and is it affecting your daytime energy or safety?",
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
      consider: "Is this a new or unusually severe pattern, or is it similar to headaches you have had before?",
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
      consider: "Have you had fever, breathlessness, chest pain, or a new exposure to smoke or an irritant?",
    },
    fever: {
      title: "The number is only one part of a fever",
      summary: "A fever is usually a sign that the immune system is responding to an infection or another trigger. Age, duration, other symptoms, and how unwell you feel help determine what to do next.",
      points: [
        "Rest, drink fluids, and use a reliable thermometer rather than judging temperature by touch alone.",
        "Follow the package directions for any fever medicine, and check with a pharmacist if you take other medicines or have a chronic condition.",
        "Write down the temperature, when it began, and any new symptoms so a clinician can see the pattern.",
      ],
      next: "Seek urgent care for confusion, a stiff neck, trouble breathing, severe dehydration, a seizure, or a fever with a rapidly worsening condition.",
      consider: "How high has the temperature been, how long has it lasted, and what other symptoms are present?",
    },
    digestive: {
      title: "Digestive symptoms are worth tracking as a pattern",
      summary: "Nausea, stomach pain, and diarrhea can have many causes, from a short-lived infection to food triggers or medicines. Timing, hydration, and severity help separate watchful waiting from a need for care.",
      points: [
        "Take small, frequent sips of fluid and return to simple foods as tolerated; avoid forcing food when you feel nauseated.",
        "Note recent foods, travel, sick contacts, new medicines, and whether symptoms wake you at night.",
        "Avoid starting anti-diarrheal or anti-nausea medicines without checking that they are appropriate for your symptoms.",
      ],
      next: "Get medical help for severe or localized pain, blood or black stools, repeated vomiting, faintness, or signs of dehydration.",
      consider: "Can you keep fluids down, and have you noticed blood, severe pain, or a clear connection to food or medication?",
    },
    stress: {
      title: "Stress can feel physical, and support can help",
      summary: "Stress and anxiety can affect sleep, digestion, focus, muscle tension, and heart rate. That does not mean every physical symptom is caused by stress, so the pattern still deserves attention.",
      points: [
        "Try one grounding practice for a few minutes: slower exhalations, naming what you can see, or a brief walk without multitasking.",
        "Protect regular sleep, meals, movement, and contact with people who help you feel safe; basics are treatment, not a test of willpower.",
        "A clinician or therapist can help when worry is persistent, hard to control, or changing how you work, sleep, or relate to others.",
      ],
      next: "If you may hurt yourself, cannot stay safe, or have severe chest pain or trouble breathing, seek urgent help now or contact local emergency services.",
      consider: "What changed recently, and what would feeling just 10% more supported look like this week?",
    },
    skin: {
      title: "A skin change is best understood over time",
      summary: "Rashes and itching can follow irritation, allergy, infection, medication, or a number of other causes. Photos and a timeline can be more useful than a single snapshot or label.",
      points: [
        "Notice where it started, whether it is spreading, and whether there is pain, warmth, drainage, or a new product or medicine.",
        "Use gentle, fragrance-free products and avoid scratching; test any new topical product on a small area first.",
        "Take a dated photo in similar lighting if the change is evolving, and show it to a pharmacist or clinician.",
      ],
      next: "Seek urgent help for swelling of the lips or tongue, trouble breathing, blistering, skin peeling, or a rapidly spreading rash with fever.",
      consider: "Did the change begin after a new medicine, product, food, plant, or illness?",
    },
    medication: {
      title: "Medication questions deserve specific details",
      summary: "The safest answer depends on the exact medicine, dose, timing, other medicines, and your health history. A pharmacist is often the quickest person to help check interactions and side effects.",
      points: [
        "Keep the medicine name, strength, directions, and start date together; a photo of the label can help during a consultation.",
        "Do not stop a prescribed medicine suddenly or double a missed dose unless the label or a clinician tells you to.",
        "Ask a pharmacist before adding an over-the-counter medicine, supplement, or herbal product.",
      ],
      next: "Call emergency services for trouble breathing, swelling of the face or throat, fainting, a seizure, or a severe reaction after taking a medicine.",
      consider: "What is the exact name and dose, and what changed after starting, stopping, or missing it?",
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
      consider: "When did this start, and what is the one change or symptom that concerns you most?",
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
            <button onClick={() => setActiveView("community")} className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeView === "community" ? "text-[#0f766e]" : "text-[#66807a] hover:text-[#173e3a]"}`}><MessageSquareText size={15} /> Community</button>
            <button onClick={() => setActiveView("care")} className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeView === "care" ? "text-[#0f766e]" : "text-[#66807a] hover:text-[#173e3a]"}`}><MapPin size={15} /> Find care</button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="relative flex items-center gap-2 rounded-full border border-[#dce7df] bg-white/80 px-3.5 py-2 text-sm font-semibold text-[#35615a] transition hover:border-[#9cc2b7] hover:bg-white">
              <UserRound size={16} /> Sign in
              {menuOpen && <span className="absolute right-0 top-12 w-56 rounded-2xl border border-[#dce7df] bg-white p-4 text-left text-xs font-normal text-[#58716c] shadow-[0_16px_40px_rgba(40,75,67,0.13)]"><strong className="mb-1 block text-sm text-[#183d3a]">Keep your answers close</strong>Create an optional account to sync your saved health notes across devices.<span className="mt-3 block font-semibold text-[#0f766e]">Coming soon</span></span>}
            </button>
          </nav>
          <button className="rounded-xl p-2 text-[#39635d] md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu size={22} /></button>
        </div>
        {menuOpen && <div className="border-t border-[#e3e8df] bg-white px-5 py-3 md:hidden"><div className="mx-auto flex max-w-[1180px] flex-wrap gap-5 text-sm font-medium text-[#4c6b65]"><button onClick={() => { setActiveView("ask"); setMenuOpen(false); }}>Ask a question</button><button onClick={() => { setActiveView("saved"); setMenuOpen(false); }}>Your library</button><button onClick={() => { setActiveView("community"); setMenuOpen(false); }}>Community</button><button onClick={() => { setActiveView("care"); setMenuOpen(false); }}>Find care</button></div></div>}
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
<div className="mb-5 rounded-[23px] border border-[#d8e4dc] bg-white p-4 shadow-[0_8px_25px_rgba(40,75,67,0.04)] sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7f2e8] text-[#0f766e]"><PenLine size={17} /></span><div><h3 className="text-sm font-bold text-[#214b45]">Build on this question</h3><p className="mt-1 text-xs leading-5 text-[#78918b]">Keep the context and ask for the next layer of detail.</p></div></div><button type="button" onClick={() => setBuildOnOpen(!buildOnOpen)} className="flex items-center gap-2 self-start rounded-full border border-[#cfe2d5] px-3.5 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#eff7f0] sm:self-auto">{buildOnOpen ? <X size={14} /> : <Plus size={14} />} {buildOnOpen ? "Close" : "Continue this question"}</button></div>{buildOnOpen && <form onSubmit={buildOnQuestion} className="mt-4 border-t border-[#e8f0e9] pt-4"><Textarea ref={buildOnRef} value={buildOnDraft} onChange={(event) => setBuildOnDraft(event.target.value)} required maxLength={500} placeholder="e.g. What should I watch for over the next few days?" className="min-h-[88px] rounded-xl border-[#d8e4dc] bg-[#fbfcf9] text-sm leading-6 focus-visible:ring-[#0f766e]" aria-label="Build on your question" /><div className="mt-3 flex justify-end"><Button type="submit" disabled={!buildOnDraft.trim()} className="h-10 rounded-full bg-[#0f766e] px-4 text-xs font-semibold text-white hover:bg-[#0a655f] disabled:bg-[#b8cac3]">Ask this follow-up <ArrowUpRight size={14} className="ml-1" /></Button></div></form>}</div>
                <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
                  <article className="overflow-hidden rounded-[26px] border border-[#d8e4dc] bg-white shadow-[0_14px_40px_rgba(40,75,67,0.06)]"><div className="border-b border-[#e6eee7] bg-[#eff7f0] p-6 sm:p-8"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge className="rounded-full border-0 bg-[#d7ecdf] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#0f766e]">A place to start</Badge><span className="text-xs text-[#759089]">Curated guidance · 5 min read</span></div><p className="mb-2 text-sm font-medium italic text-[#76908a]">“{question.trim()}”</p><h2 id="answer-title" className="max-w-[650px] font-serif text-[32px] font-semibold leading-tight tracking-[-0.035em] text-[#183d3a]">{answerCopy.title}</h2><p className="mt-4 max-w-[700px] text-[16px] leading-7 text-[#4f7068]">{answerCopy.summary}</p></div><div className="p-6 sm:p-8"><h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-[#183d3a]"><FileText size={17} className="text-[#0f766e]" /> Helpful things to know</h3><ul className="space-y-4">{answerCopy.points.map((point) => <li key={point} className="flex gap-3 text-[15px] leading-7 text-[#52726b]"><span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f3e9] text-[#0f766e]"><Check size={12} strokeWidth={3} /></span>{point}</li>)}</ul><div className="mt-7 rounded-2xl border border-[#f3d7c9] bg-[#fff6f0] p-4"><div className="flex gap-3"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#d66e54]" /><div><h4 className="text-sm font-bold text-[#8d4939]">When to get more help</h4><p className="mt-1 text-sm leading-6 text-[#885e55]">{answerCopy.next}</p></div></div></div></div></article>
                  <aside className="space-y-5"><div className="rounded-[23px] border border-[#d8e4dc] bg-white p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e7f2e8] text-[#0f766e]"><Stethoscope size={16} /></span><h3 className="text-sm font-bold text-[#214b45]">Questions for a clinician</h3></div><p className="text-sm leading-6 text-[#68837c]">“What else could cause this pattern?”</p><p className="mt-3 text-sm leading-6 text-[#68837c]">“What changes should make me follow up?”</p><p className="mt-3 border-t border-[#e8f0e9] pt-3 text-xs leading-5 text-[#7a948c]"><span className="font-semibold text-[#4f7169]">A useful detail:</span> {answerCopy.consider}</p><a href="https://www.ahrq.gov/questions/index.html" target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1 text-xs font-bold text-[#0f766e] hover:underline">See conversation guide <ChevronRight size={14} /></a></div><div className="rounded-[23px] border border-[#d8e4dc] bg-[#fbfcf9] p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen size={17} className="text-[#0f766e]" /><h3 className="text-sm font-bold text-[#214b45]">Sources</h3></div><span className="text-[10px] font-bold uppercase tracking-wider text-[#91a69f]">3 reviewed</span></div><div className="space-y-3">{sourceLinks.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.name} className="group flex items-start justify-between gap-2"><span><span className="block text-xs font-semibold text-[#446a62] group-hover:text-[#0f766e]">{source.name}</span><span className="block text-[11px] text-[#91a69f]">{source.detail}</span></span><ExternalLink size={13} className="mt-0.5 shrink-0 text-[#8ba69e]" /></a>)}</div></div></aside>
                </div>
                <div className="mt-6 rounded-[23px] border border-[#d8e4dc] bg-[#fbfcf9] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7f2e8] text-[#0f766e]"><MessageCircle size={17} /></span><div><h3 className="text-sm font-bold text-[#214b45]">Have a follow-up?</h3><p className="mt-1 text-xs leading-5 text-[#78918b]">Choose a detail and we’ll take the next step with you.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{followUps.map((followUp) => <button type="button" key={followUp.question} onClick={() => setSelectedFollowUp(followUp)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${selectedFollowUp?.question === followUp.question ? "border-[#0f766e] bg-[#e6f3eb] text-[#0f766e]" : "border-[#d8e4dc] bg-white text-[#5f7b74] hover:border-[#8dbeb1] hover:text-[#0f766e]"}`}>{followUp.question}</button>)}</div>{selectedFollowUp && <div className="mt-4 rounded-2xl border border-[#e3eee5] bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f766e]"><Sparkles size={13} /> A more specific next step</div><p className="mt-2 text-sm leading-6 text-[#52726b]">{selectedFollowUp.answer}</p></div>}</div>
                <div className="mt-6 flex items-start gap-2 px-1 text-xs leading-5 text-[#8ba09a]"><Info size={14} className="mt-0.5 shrink-0" />Clarity provides general educational information, not a diagnosis or personalized medical advice. If you’re worried about a symptom, a qualified healthcare professional can help.</div>
              </section>
            ) : (
              <section className="mt-10 grid gap-5 pb-8 md:grid-cols-[1.15fr_0.85fr]">
                <div className="relative overflow-hidden rounded-[26px] bg-[#e9f2e7] p-6 sm:p-8"><div className="relative z-10 max-w-[430px]"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0f766e] shadow-sm"><HeartPulse size={20} /></div><h2 className="font-serif text-[27px] font-semibold tracking-[-0.03em] text-[#234b46]">Make your next health conversation easier.</h2><p className="mt-3 text-sm leading-6 text-[#638078]">Understand the basics, spot what matters, and go into your next appointment with better questions.</p><button onClick={() => chooseQuestion("What should I ask my doctor about a new symptom?")} className="mt-5 flex items-center gap-2 text-sm font-bold text-[#0f766e] hover:underline">See an example answer <ArrowUpRight size={15} /></button></div><div className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full border-[22px] border-[#d4e7d5]" /><div className="absolute -right-4 top-8 h-20 w-20 rounded-full bg-[#f5cfbb]/60" /></div>
                <div className="rounded-[26px] border border-[#d8e4dc] bg-white p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-serif text-[23px] font-semibold text-[#234b46]">Popular starting points</h2><p className="mt-1 text-xs text-[#829991]">Questions people ask often</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7f2] text-[#0f766e]"><MessageCircle size={17} /></span></div><div className="space-y-2">{quickQuestions.map((prompt, index) => <button key={prompt} onClick={() => chooseQuestion(prompt)} className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f1f7f1]"><span className="flex items-center gap-3 text-sm text-[#56766e]"><span className="font-serif text-sm italic text-[#b0c1b8]">0{index + 1}</span>{prompt}</span><ChevronRight size={15} className="text-[#aac0b7] transition group-hover:translate-x-1 group-hover:text-[#0f766e]" /></button>)}</div></div>
              </section>
            )}
          </>
        ) : activeView === "saved" ? (
          <section className="pb-10 pt-12 md:pt-16"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]"><History size={15} /> Your private library</div><h1 className="font-serif text-[44px] font-semibold tracking-[-0.05em] text-[#173e3a]">Saved for later<span className="text-[#e2755e]">.</span></h1><p className="mt-3 text-[16px] text-[#718b84]">A quiet place for the questions you want to revisit.</p></div><button onClick={() => { setActiveView("ask"); setAnswerVisible(false); }} className="flex items-center gap-2 self-start rounded-full bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a655f]"><PenLine size={15} /> Ask something new</button></div>{savedQuestions.length ? <div className="grid gap-4 md:grid-cols-2">{savedQuestions.map((savedQuestion, index) => <div key={savedQuestion} className="group rounded-[23px] border border-[#d8e4dc] bg-white p-5 shadow-[0_8px_25px_rgba(40,75,67,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(40,75,67,0.08)]"><div className="mb-6 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8aa29a]"><Clock3 size={14} /> Saved question 0{index + 1}</span><button onClick={() => { setQuestion(savedQuestion); setSavedQuestions(savedQuestions.filter((item) => item !== savedQuestion)); }} className="rounded-full p-1.5 text-[#9bb0aa] opacity-0 transition hover:bg-[#fff2ed] hover:text-[#d66e54] group-hover:opacity-100" aria-label={`Remove ${savedQuestion}`}><X size={15} /></button></div><p className="font-serif text-[22px] font-semibold leading-snug text-[#234b46]">{savedQuestion}</p><button onClick={() => { setQuestion(savedQuestion); setActiveView("ask"); setAnswerVisible(true); }} className="mt-5 flex items-center gap-1 text-xs font-bold text-[#0f766e]">Open answer <ArrowUpRight size={14} /></button></div>)}</div> : <div className="rounded-[26px] border border-dashed border-[#c9dcd0] bg-white/50 p-12 text-center"><Bookmark size={26} className="mx-auto text-[#8aada0]" /><p className="mt-4 font-serif text-2xl font-semibold text-[#315951]">Your library is waiting.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#819a91]">Save an answer while you explore and it will show up here in this browser.</p></div>}<div className="mt-8 flex items-start gap-2 text-xs leading-5 text-[#8ba09a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0f766e]" />Your saved questions stay in this browser. Create an account later if you’d like to sync them across devices.</div></section>
        ) : activeView === "community" ? (
          <section className="pb-10 pt-12 md:pt-16">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]"><MessageSquareText size={15} /> The Clarity Commons</div><h1 className="font-serif text-[44px] font-semibold tracking-[-0.05em] text-[#173e3a]">Ask together<span className="text-[#e2755e]">.</span></h1><p className="mt-3 max-w-xl text-[16px] leading-7 text-[#718b84]">A thoughtful space for real-life health questions, lived experience, and kind replies. Share carefully and protect your privacy.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => void loadCommunity()} className="flex h-10 items-center gap-2 rounded-full border border-[#d8e4dc] bg-white px-4 text-xs font-semibold text-[#5d7b73] transition hover:border-[#94bdb1] hover:text-[#0f766e]" aria-label="Refresh community"><RefreshCw size={14} /> Refresh</button><button type="button" onClick={() => setCommunityFormOpen(!communityFormOpen)} className="flex h-10 items-center gap-2 rounded-full bg-[#0f766e] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0a655f]"><Plus size={15} /> Ask the community</button></div></div>
            {communityError && <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[#f3d7c9] bg-[#fff6f0] px-4 py-3 text-sm text-[#885e55]"><span>{communityError}</span><button type="button" onClick={() => void loadCommunity()} className="shrink-0 font-semibold text-[#b45b47] hover:underline">Try again</button></div>}
            {communityFormOpen && <form onSubmit={submitCommunityQuestion} className="mb-5 rounded-[26px] border border-[#cfe2d5] bg-white p-5 shadow-[0_12px_30px_rgba(40,75,67,0.06)] sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-serif text-[25px] font-semibold text-[#234b46]">Start a thoughtful thread</h2><p className="mt-1 text-xs leading-5 text-[#78918b]">Do not include names, phone numbers, or other private medical details.</p></div><button type="button" onClick={() => setCommunityFormOpen(false)} className="rounded-full p-1.5 text-[#90a9a0] hover:bg-[#f2f7f2] hover:text-[#0f766e]" aria-label="Close question form"><X size={17} /></button></div><div className="grid gap-4 sm:grid-cols-[1fr_180px]"><label className="text-xs font-semibold text-[#53736b]">Question title<input value={communityTitle} onChange={(event) => setCommunityTitle(event.target.value)} minLength={5} maxLength={180} required placeholder="What would you like to understand?" className="mt-2 h-11 w-full rounded-xl border border-[#d8e4dc] bg-[#fbfcf9] px-3 text-sm font-normal text-[#234b46] outline-none ring-[#0f766e] placeholder:text-[#a7b9b2] focus:ring-2" /></label><label className="text-xs font-semibold text-[#53736b]">Topic<select value={communityTopic} onChange={(event) => setCommunityTopic(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#d8e4dc] bg-[#fbfcf9] px-3 text-sm font-normal text-[#234b46] outline-none focus:ring-2 focus:ring-[#0f766e]"><option>General</option><option>Sleep</option><option>Headaches</option><option>Medication</option><option>Mental wellbeing</option></select></label></div><label className="mt-4 block text-xs font-semibold text-[#53736b]">Give a little context<Textarea value={communityBody} onChange={(event) => setCommunityBody(event.target.value)} minLength={20} maxLength={5000} required placeholder="What have you noticed, and what kind of perspective would help?" className="mt-2 min-h-[115px] rounded-xl border-[#d8e4dc] bg-[#fbfcf9] text-sm leading-6 focus-visible:ring-[#0f766e]" /></label><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><label className="text-xs font-semibold text-[#53736b]">Display name<input value={communityName} onChange={(event) => setCommunityName(event.target.value)} maxLength={60} className="ml-2 h-9 w-36 rounded-lg border border-[#d8e4dc] bg-[#fbfcf9] px-2 text-xs font-normal text-[#234b46] outline-none focus:ring-2 focus:ring-[#0f766e]" /></label><button type="submit" disabled={communitySubmitting} className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#0f766e] px-4 text-xs font-semibold text-white hover:bg-[#0a655f] disabled:cursor-wait disabled:opacity-60">{communitySubmitting ? "Posting…" : "Post question"} <Send size={14} /></button></div></form>}
            <div className="grid gap-5 lg:grid-cols-[350px_1fr]">
              <aside className="rounded-[26px] border border-[#d8e4dc] bg-white p-4 shadow-[0_10px_30px_rgba(40,75,67,0.04)]"><div className="mb-3 flex items-center justify-between px-2"><div><h2 className="font-serif text-[22px] font-semibold text-[#234b46]">Recent questions</h2><p className="mt-1 text-xs text-[#8aa098]">Open conversations from the community</p></div><span className="rounded-full bg-[#eff7f0] px-2.5 py-1 text-[10px] font-bold text-[#0f766e]">{communityQuestions.length}</span></div>{communityLoading ? <div className="space-y-2 p-2"><div className="h-20 animate-pulse rounded-2xl bg-[#f1f6f1]" /><div className="h-20 animate-pulse rounded-2xl bg-[#f1f6f1]" /><div className="h-20 animate-pulse rounded-2xl bg-[#f1f6f1]" /></div> : communityQuestions.length ? <div className="space-y-2">{communityQuestions.map((item) => <button type="button" key={item.id} onClick={() => setSelectedCommunityId(item.id)} className={selectedCommunityId === item.id ? "w-full rounded-2xl border border-[#b9d8c6] bg-[#edf7ef] p-3 text-left" : "w-full rounded-2xl border border-transparent p-3 text-left transition hover:border-[#d8e4dc] hover:bg-[#fbfcf9]"}><div className="mb-2 flex items-center justify-between gap-2"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0f766e]">{item.topic}</span><span className="text-[10px] text-[#9aada6]">{formatCommunityDate(item.created_at)}</span></div><p className="line-clamp-2 font-serif text-[17px] font-semibold leading-6 text-[#315951]">{item.title}</p><p className="mt-1 text-xs text-[#78918b]">{item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}</p></button>)}</div> : <div className="rounded-2xl bg-[#fbfcf9] p-6 text-center"><MessageSquareText size={24} className="mx-auto text-[#8aada0]" /><p className="mt-3 font-serif text-lg font-semibold text-[#315951]">Be the first to ask.</p><p className="mt-1 text-xs leading-5 text-[#819a91]">Start a thread and invite a thoughtful reply.</p></div>}</aside>
              {selectedCommunityQuestion ? <article className="rounded-[26px] border border-[#d8e4dc] bg-white p-5 shadow-[0_10px_30px_rgba(40,75,67,0.04)] sm:p-7"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#eff7f0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#0f766e]">{selectedCommunityQuestion.topic}</span><span className="text-xs text-[#93a8a0]">{formatCommunityDate(selectedCommunityQuestion.created_at)}</span></div><h2 className="mt-5 font-serif text-[31px] font-semibold leading-tight tracking-[-0.03em] text-[#234b46]">{selectedCommunityQuestion.title}</h2><p className="mt-4 text-[15px] leading-7 text-[#5b786f]">{selectedCommunityQuestion.body}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#78918b]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dceddf] text-[#0f766e]"><UserRound size={14} /></span>{selectedCommunityQuestion.display_name}</div><div className="my-7 h-px bg-[#e9efe9]" /><div className="flex items-center gap-2"><MessageCircle size={17} className="text-[#0f766e]" /><h3 className="font-serif text-[22px] font-semibold text-[#234b46]">Thoughtful replies <span className="font-sans text-sm font-medium text-[#8da39b]">{selectedCommunityQuestion.replies.length}</span></h3></div><div className="mt-5 space-y-4">{selectedCommunityQuestion.replies.length ? selectedCommunityQuestion.replies.map((reply) => <div key={reply.id} className="rounded-2xl bg-[#f5f8f4] p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#4c6e65]">{reply.display_name}</span><span className="text-[10px] text-[#9aada6]">{formatCommunityDate(reply.created_at)}</span></div><p className="mt-2 text-sm leading-6 text-[#5b786f]">{reply.body}</p></div>) : <p className="rounded-2xl border border-dashed border-[#cfe0d4] p-5 text-center text-sm text-[#819a91]">No replies yet. Add the first thoughtful perspective.</p>}</div><form onSubmit={submitCommunityReply} className="mt-6 rounded-2xl border border-[#dce9df] bg-[#fbfcf9] p-4"><label className="text-xs font-semibold text-[#53736b]">Join the conversation<Textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} minLength={5} maxLength={2500} required placeholder="Share an experience, a helpful question, or a gentle suggestion…" className="mt-2 min-h-[100px] rounded-xl border-[#d8e4dc] bg-white text-sm leading-6 focus-visible:ring-[#0f766e]" /></label><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><label className="text-xs font-semibold text-[#53736b]">Display name<input value={replyName} onChange={(event) => setReplyName(event.target.value)} maxLength={60} className="ml-2 h-9 w-36 rounded-lg border border-[#d8e4dc] bg-white px-2 text-xs font-normal text-[#234b46] outline-none focus:ring-2 focus:ring-[#0f766e]" /></label><button type="submit" disabled={communitySubmitting} className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#0f766e] px-4 text-xs font-semibold text-white hover:bg-[#0a655f] disabled:cursor-wait disabled:opacity-60">{communitySubmitting ? "Posting…" : "Reply"} <Send size={14} /></button></div></form></article> : <div className="flex min-h-[440px] items-center justify-center rounded-[26px] border border-dashed border-[#c9dcd0] bg-white/60 p-10 text-center"><div><MessageSquareText size={30} className="mx-auto text-[#8aada0]" /><h2 className="mt-4 font-serif text-2xl font-semibold text-[#315951]">Choose a question to join in.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#819a91]">Read the full context, then add a reply that helps someone feel more informed and less alone.</p></div></div>}
            </div>
            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#8ba09a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0f766e]" />Community replies are personal perspectives, not medical advice. Do not share identifying or private health information.</p>
          </section>
        ) : (
          <section className="pb-10 pt-12 md:pt-16">
            <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]"><MapPin size={15} /> Nearby care</div><h1 className="font-serif text-[44px] font-semibold tracking-[-0.05em] text-[#173e3a]">Find care nearby<span className="text-[#e2755e]">.</span></h1><p className="mt-3 max-w-2xl text-[16px] leading-7 text-[#718b84]">Find doctor offices and clinics near you, see their phone numbers when listed, and open directions in a map.</p></div>
            <div className="rounded-[26px] border border-[#d8e4dc] bg-white p-5 shadow-[0_12px_30px_rgba(40,75,67,0.05)] sm:p-6"><form onSubmit={findCareByLocation} className="flex flex-col gap-3 md:flex-row"><label className="sr-only" htmlFor="care-location">City, ZIP code, or neighborhood</label><input id="care-location" value={careLocation} onChange={(event) => setCareLocation(event.target.value)} placeholder="City, ZIP code, or neighborhood" className="h-12 min-w-0 flex-1 rounded-xl border border-[#d8e4dc] bg-[#fbfcf9] px-4 text-sm text-[#234b46] outline-none placeholder:text-[#a7b9b2] focus:ring-2 focus:ring-[#0f766e]" /><button type="submit" disabled={careLoading || !careLocation.trim()} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 text-sm font-semibold text-white hover:bg-[#0a655f] disabled:cursor-wait disabled:bg-[#b8cac3]"><Search size={16} /> Search nearby</button><button type="button" onClick={useMyLocation} disabled={careLoading} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#cfe2d5] bg-[#eff7f0] px-4 text-sm font-semibold text-[#0f766e] hover:bg-[#e4f2e7] disabled:opacity-60"><LocateFixed size={16} /> Use my location</button></form><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#8ba09a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0f766e]" />Your location is used only in this browser to search OpenStreetMap. Clarity does not store it.</p></div>
            {careError && <div className="mt-5 rounded-2xl border border-[#f3d7c9] bg-[#fff6f0] px-4 py-3 text-sm text-[#885e55]">{careError}</div>}
            {careLoading && <div className="mt-6 rounded-[26px] border border-[#d8e4dc] bg-white p-8 text-center"><RefreshCw size={22} className="mx-auto animate-spin text-[#0f766e]" /><p className="mt-3 font-serif text-xl font-semibold text-[#315951]">Looking for nearby offices…</p><p className="mt-1 text-sm text-[#819a91]">Checking public map listings and contact details.</p></div>}
            {!careCoordinates && !careLoading && <div className="mt-6 grid gap-5 md:grid-cols-2"><div className="rounded-[26px] bg-[#e9f2e7] p-7"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0f766e] shadow-sm"><MapPin size={21} /></div><h2 className="mt-5 font-serif text-[27px] font-semibold tracking-[-0.03em] text-[#234b46]">Start with a place.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#638078]">Search by city or ZIP code, or let your browser share your approximate location. We’ll show the closest public listings we can find.</p></div><div className="rounded-[26px] border border-[#d8e4dc] bg-white p-7"><div className="flex items-center gap-2 text-[#0f766e]"><Phone size={18} /><span className="text-[11px] font-bold uppercase tracking-[0.14em]">About phone numbers</span></div><h2 className="mt-4 font-serif text-[23px] font-semibold text-[#234b46]">Call before you go.</h2><p className="mt-2 text-sm leading-6 text-[#78918b]">Phone numbers come from public OpenStreetMap listings and may be missing or out of date. Always confirm hours, services, and insurance with the office.</p></div></div>}
            {careCoordinates && !careLoading && <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]"><div className="overflow-hidden rounded-[26px] border border-[#d8e4dc] bg-white shadow-[0_10px_30px_rgba(40,75,67,0.04)]"><div className="flex items-center justify-between gap-3 border-b border-[#e8f0e9] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f766e]">Map area</p><p className="mt-1 text-sm font-semibold text-[#315951]">{careCoordinates.label}</p></div><a href={"https://www.openstreetmap.org/?mlat=" + careCoordinates.latitude + "&mlon=" + careCoordinates.longitude + "#map=14/" + careCoordinates.latitude + "/" + careCoordinates.longitude} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#0f766e] hover:underline">Open full map <ExternalLink size={13} /></a></div><div className="h-[460px] bg-[#e9f2e7]"><iframe title="Map of nearby doctor offices" src={careMapUrl} className="h-full w-full border-0" loading="lazy" /></div></div><div className="rounded-[26px] border border-[#d8e4dc] bg-white p-4 shadow-[0_10px_30px_rgba(40,75,67,0.04)]"><div className="mb-3 flex items-center justify-between px-2"><div><h2 className="font-serif text-[23px] font-semibold text-[#234b46]">Closest listings</h2><p className="mt-1 text-xs text-[#8aa098]">Up to 8 public map listings</p></div><span className="rounded-full bg-[#eff7f0] px-2.5 py-1 text-[10px] font-bold text-[#0f766e]">{carePlaces.length}</span></div>{carePlaces.length ? <div className="space-y-2">{carePlaces.slice(0, 8).map((place) => <div key={place.id} className="rounded-2xl border border-[#e5eee7] bg-[#fbfcf9] p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-[17px] font-semibold leading-5 text-[#315951]">{place.name}</h3><p className="mt-1 text-xs leading-5 text-[#78918b]">{place.address}</p></div><span className="shrink-0 rounded-full bg-[#e7f2e8] px-2 py-1 text-[10px] font-bold text-[#0f766e]">{place.distanceKm.toFixed(1)} km</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">{place.phone ? <a href={"tel:" + formatPhoneHref(place.phone)} className="flex items-center gap-1 font-semibold text-[#0f766e] hover:underline"><Phone size={13} /> {place.phone}</a> : <span className="flex items-center gap-1 text-[#9aaea7]"><Phone size={13} /> Phone not listed</span>}<a href={"https://www.openstreetmap.org/?mlat=" + place.latitude + "&mlon=" + place.longitude + "#map=18/" + place.latitude + "/" + place.longitude} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#64827a] hover:text-[#0f766e]">Directions <ExternalLink size={12} /></a></div></div>)}</div> : <div className="rounded-2xl bg-[#fbfcf9] p-6 text-center"><MapPin size={23} className="mx-auto text-[#8aada0]" /><p className="mt-3 text-sm font-semibold text-[#55756d]">No offices were listed nearby.</p><p className="mt-1 text-xs leading-5 text-[#819a91]">Try a nearby city or a broader search area.</p></div>}</div></div>}
          </section>
        )}
      </main>

      <footer className="border-t border-[#e3e8df] bg-[#f1f2eb] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-4 text-xs text-[#819991] sm:flex-row sm:items-center"><div className="flex items-center gap-2 font-semibold text-[#54746c]"><LogoMark /><span>Clarity Health</span></div><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><span>Educational information, not medical advice</span><a href="https://www.cdc.gov/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0f766e]">Our sources <ExternalLink size={12} /></a></div></div></footer>
    </div>
  );
}

export default Index;
