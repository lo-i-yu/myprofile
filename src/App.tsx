import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  collection,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "./lib/firebase";
import {
  User,
  Code,
  BookOpen,
  Briefcase,
  Mail,
  ExternalLink,
  Github,
  Linkedin,
  Award,
  ChevronRight,
  Monitor,
  Database,
  Layout,
  Terminal,
  GraduationCap,
  Sparkles,
  X,
  GripVertical,
} from "lucide-react";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

// --- Utilities ---
const getDirectImageUrl = (url: string) => {
  if (!url) return url;
  try {
    if (url.includes("drive.google.com")) {
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch && fileMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
      }
      const openMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000`;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors
  }
  return url;
};

// --- Types ---
interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  link?: string;
  features: string[];
  achievement?: string;
}

interface Achievement {
  id: string;
  title: string;
  organization: string;
  date: string;
  description: string;
  type: "Award" | "Course" | "Certificate";
}

interface Skill {
  name: string;
  level: number; // 1-5
  category: "Graphic" | "UXUI" | "Media" | "Other";
}

// --- Data (Example - User should replace with their real data) ---
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "1",
    title: "《森呼吸》品牌識別規劃",
    description:
      "為在地環保概念咖啡廳設計的完整品牌識別系統，包含 Logo、菜單底圖與商業攝影。",
    tags: ["Illustrator", "Photoshop", "品牌設計"],
    image:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop",
    features: ["手繪風格字體設計", "環保材質周邊包裝設計", "整體色調企劃"],
    achievement: "獲得 112 學年度校內專題展 第一名",
    link: "#",
  },
  {
    id: "2",
    title: "偏鄉教育公益 App 介面設計",
    description:
      "協助非營利組織設計的志工媒合平台 App，重點在於直覺的操作流程與溫暖的視覺語彙。",
    tags: ["Figma", "UI/UX", "User Research"],
    image:
      "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?q=80&w=800&auto=format&fit=crop",
    features: [
      "符合無障礙設計規範",
      "建立 Design System 元件庫",
      "以人物誌導向的互動設計",
    ],
    achievement: "入圍放視大賞行動應用類",
    link: "#",
  },
  {
    id: "3",
    title: "畢業紀念冊主視覺統籌",
    description:
      "擔任全校畢業紀念冊美術總監，規劃主題風格『啟航』，並帶領團隊完成近兩百頁的版面設計。",
    tags: ["InDesign", "排版", "團隊合作"],
    image:
      "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=800&auto=format&fit=crop",
    features: [
      "百頁以上複雜排版與網格系統",
      "印前打樣與色彩管理",
      "跨班級攝影進度協調",
    ],
    link: "#",
  },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    title: "全國學生美術比賽 - 平面設計類 特優",
    organization: "教育部",
    date: "2024",
    description: "以《未來校園》為主題創作的海報設計，獲得全國特優肯定。",
    type: "Award",
  },
  {
    id: "a2",
    title: "Google UX Design Professional Certificate",
    organization: "Coursera",
    date: "2023",
    description:
      "完成為期 6 個月的 Google UX 專業認證，掌握使用者研究、線框圖與原型設計。",
    type: "Course",
  },
  {
    id: "a3",
    title: "印前製程乙級技術士技能檢定",
    organization: "勞動部",
    date: "2023",
    description: "取得國家級印前製程專業證照。",
    type: "Certificate",
  },
];

const DEFAULT_SKILLS: Skill[] = [
  { name: "Adobe Illustrator / Photoshop", level: 5, category: "Graphic" },
  { name: "Figma / UI Design", level: 4, category: "UXUI" },
  { name: "Premiere Pro / After Effects", level: 4, category: "Media" },
  { name: "色彩學與排版設計", level: 5, category: "Graphic" },
  { name: "品牌識別設計 (CIS)", level: 4, category: "Graphic" },
  { name: "攝影與佈光", level: 3, category: "Media" },
];

// --- Sub-components ---

const SectionHeading = ({
  children,
  icon: Icon,
  id,
}: {
  children: React.ReactNode;
  icon: React.ElementType;
  id: string;
}) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex flex-col items-center gap-4 mb-24 scroll-mt-32"
  >
    <div className="flex items-center justify-center w-12 h-12 border border-stone-300 text-stone-800 rotate-45 mb-2">
      <div className="-rotate-45">
        <Icon size={22} strokeWidth={1.5} />
      </div>
    </div>
    <h2 className="text-3xl md:text-5xl font-serif font-black tracking-widest text-stone-900 text-center relative z-10">
      {children}
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-1 bg-stone-900"></span>
    </h2>
  </motion.div>
);

const ADMIN_EMAILS = ["lou0972875947@gmail.com", "fish20080901@gmail.com"];
const checkIsAdmin = (user: FirebaseUser | null) => {
  return user?.email ? ADMIN_EMAILS.includes(user.email) : false;
};

const AdminLogin = ({ user }: { user: FirebaseUser | null }) => {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Login Error:", e);
      alert(
        `登入發生錯誤：${e.message}\n\n可能原因：\n1. 若您在預覽視窗內操作，請點擊右上角「在新分頁中開啟」。\n2. 您的應用程式網址未加入 Firebase Console 的 Authorized domains (授權網域) 中。\n請至 Firebase 後台 -> Authentication -> Settings -> Authorized domains 加入此網址。`,
      );
    }
  };

  if (user) {
    if (!checkIsAdmin(user)) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-red-500 text-xs">非管理員帳號</span>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors"
          >
            登出並切換帳號
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => signOut(auth)}
        className="text-xs text-blue-500 underline"
      >
        登出管理員
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="text-xs text-slate-300 hover:text-slate-500 transition-colors"
    >
      Admin Login
    </button>
  );
};

const AddProjectForm = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    achievement: "",
    tags: "",
    features: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, "projects"), {
        title: formData.title,
        description: formData.description,
        image:
          formData.image ||
          "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop",
        link: formData.link || "",
        achievement: formData.achievement || "",
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        features: formData.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "projects");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">新增作品專案</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">作品名稱</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">作品簡介</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl resize-none"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              標籤 (用逗號分隔)
            </label>
            <input
              required
              type="text"
              value={formData.tags}
              placeholder="React, TypeScript, CSS"
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              圖片網址
              <span className="block text-xs font-normal text-slate-500 mt-0.5">
                支援 Google 雲端硬碟連結 (需設為「知道連結的使用者皆可查看」)
              </span>
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              作品連結 (選填)
            </label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              成就/獎項 (選填)
            </label>
            <input
              type="text"
              value={formData.achievement}
              onChange={(e) =>
                setFormData({ ...formData, achievement: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              核心技術亮點 (每行一個)
            </label>
            <textarea
              required
              rows={4}
              value={formData.features}
              onChange={(e) =>
                setFormData({ ...formData, features: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl resize-none"
            ></textarea>
          </div>

          <div className="flex gap-4 pt-4 mt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              disabled={submitting}
              type="submit"
              className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "新增中..." : "新增作品"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DEFAULT_PROFILE = {
  name: "王小明",
  tagline: "品牌識別",
  tagline2: "產品設計",
  photoUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=500&auto=format&fit=crop",
};

const EditProfileModal = ({
  data,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: data.name,
    tagline: data.tagline,
    tagline2: data.tagline2,
    photoUrl: data.photoUrl,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "portfolio_data", "main"),
        { profile: formData },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">編輯個人基本資料</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">您的名字</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">專注領域 1</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) =>
                setFormData({ ...formData, tagline: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
              placeholder="例如：品牌識別"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">專注領域 2</label>
            <input
              type="text"
              value={formData.tagline2}
              onChange={(e) =>
                setFormData({ ...formData, tagline2: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
              placeholder="例如：產品設計"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              照片圖片網址 (URL)
              <span className="block text-xs font-normal text-slate-500 mt-0.5">
                支援 Google 雲端硬碟連結 (需設為「知道連結的使用者皆可查看」)
              </span>
            </label>
            <input
              type="text"
              value={formData.photoUrl}
              onChange={(e) =>
                setFormData({ ...formData, photoUrl: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div className="flex gap-4 pt-4 mt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              disabled={submitting}
              onClick={handleSave}
              className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_FOOTER = {
  copyrightTitle: "Wang Xiao-Ming",
  copyrightText: "© 2026 Personal Showcase. Crafted with intention.",
};

const EditFooterModal = ({
  data,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    copyrightTitle: data.copyrightTitle,
    copyrightText: data.copyrightText,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "portfolio_data", "main"),
        { footer: formData },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">編輯頁尾資料</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">主標題</label>
            <input
              type="text"
              value={formData.copyrightTitle}
              onChange={(e) =>
                setFormData({ ...formData, copyrightTitle: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              版權宣告文字
            </label>
            <input
              type="text"
              value={formData.copyrightText}
              onChange={(e) =>
                setFormData({ ...formData, copyrightText: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div className="flex gap-4 pt-4 mt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              disabled={submitting}
              onClick={handleSave}
              className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_ABOUT = {
  paragraphs: [
    "我目前就讀於廣告設計科，我對設計的熱情源自於對「美感」的追求，以及用視覺「解決問題」的渴望。",
    "自接觸 Illustrator 與 Photoshop 以來，我便被這些工具能夠將抽象構思轉換為具體視覺的力量所吸引。我不只是在學習軟體操作，更是在學習一種「用畫面說故事」的能力。",
    "在高中三年的探索中，我發現自己不僅熱愛平面視覺，也對人機互動與使用者體驗（UI/UX）深具興趣。我曾多次主導校內設計專案，擔任過畢策團隊的美術總編，這些經歷磨練了我的溝通、排版與專案規劃能力。",
  ],
  tags: ["設計思考導向", "視覺洞察力", "跨領域協作", "熱愛排版字體"],
};

const EditAboutModal = ({
  data,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) => {
  const [paragraphs, setParagraphs] = useState(data.paragraphs.join("\n\n"));
  const [tags, setTags] = useState(data.tags.join(", "));
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "portfolio_data", "main"),
        {
          about: {
            paragraphs: paragraphs
              .split("\n\n")
              .map((p: string) => p.trim())
              .filter(Boolean),
            tags: tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
          },
        },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">編輯自我介紹</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              介紹段落 (段落間請空一行)
            </label>
            <textarea
              rows={8}
              value={paragraphs}
              onChange={(e) => setParagraphs(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl resize-none"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              特質標籤 (用逗號分隔)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <div className="flex gap-4 pt-4 mt-4 border-t sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              disabled={submitting}
              onClick={handleSave}
              className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditSkillsModal = ({
  data,
  onClose,
}: {
  data: Skill[];
  onClose: () => void;
}) => {
  const [items, setItems] = useState<Skill[]>(data);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "portfolio_data", "main"),
        { skills: items },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-2xl font-bold">編輯專業專長</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setItems([
                  ...items,
                  { name: "", level: 3, category: "Graphic" },
                ])
              }
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-bold"
            >
              + 新增技能
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="skills">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4 overflow-y-auto flex-1 pr-2"
              >
                {items.map((item, idx) => (
                  <Draggable
                    key={item.name + idx}
                    draggableId={`skill-${idx}`}
                    index={idx}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <GripVertical size={20} />
                        </div>
                        <input
                          type="text"
                          value={item.name}
                          placeholder="技能名稱"
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].name = e.target.value;
                            setItems(newItems);
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={item.level}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].level = Number(e.target.value);
                            setItems(newItems);
                          }}
                          className="w-20 px-3 py-2 border rounded-lg"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].category = e.target.value as any;
                            setItems(newItems);
                          }}
                          className="w-32 px-3 py-2 border rounded-lg bg-white"
                        >
                          <option value="Graphic">平面設計</option>
                          <option value="UXUI">UI/UX</option>
                          <option value="Media">影音剪輯</option>
                          <option value="Other">其他</option>
                        </select>
                        <button
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== idx);
                            setItems(newItems);
                          }}
                          className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold shrink-0"
                        >
                          刪除
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex gap-4 pt-4 mt-4 border-t sticky bottom-0 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            disabled={submitting}
            onClick={handleSave}
            className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

const EditAchievementsModal = ({
  data,
  onClose,
}: {
  data: Achievement[];
  onClose: () => void;
}) => {
  const [items, setItems] = useState<Achievement[]>(data);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "portfolio_data", "main"),
        { achievements: items },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-2xl font-bold">編輯課程與成就</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setItems([
                  ...items,
                  {
                    id: Date.now().toString(),
                    title: "",
                    organization: "",
                    date: "",
                    description: "",
                    type: "Award",
                  },
                ])
              }
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-bold"
            >
              + 新增成就
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="achievements">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-6 overflow-y-auto flex-1 pr-2"
              >
                {items.map((item, idx) => (
                  <Draggable
                    key={item.id || String(idx)}
                    draggableId={item.id || String(idx)}
                    index={idx}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border relative"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-grab px-2"
                        >
                          <GripVertical size={20} />
                        </div>
                        <div className="flex gap-4 text-sm font-medium pl-8">
                          <input
                            type="text"
                            value={item.title}
                            placeholder="標題"
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].title = e.target.value;
                              setItems(newItems);
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg"
                          />
                          <input
                            type="text"
                            value={item.organization}
                            placeholder="組織/頒發單位"
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].organization = e.target.value;
                              setItems(newItems);
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div className="flex gap-4 text-sm font-medium pl-8">
                          <input
                            type="text"
                            value={item.date}
                            placeholder="年份/日期"
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].date = e.target.value;
                              setItems(newItems);
                            }}
                            className="w-32 px-3 py-2 border rounded-lg"
                          />
                          <select
                            value={item.type}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].type = e.target.value as any;
                              setItems(newItems);
                            }}
                            className="w-32 px-3 py-2 border rounded-lg bg-white"
                          >
                            <option value="Award">獎項</option>
                            <option value="Course">課程</option>
                            <option value="Certificate">證照</option>
                          </select>
                          <input
                            type="text"
                            value={item.description}
                            placeholder="描述文字..."
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].description = e.target.value;
                              setItems(newItems);
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg"
                          />
                          <button
                            onClick={() => {
                              const newItems = items.filter(
                                (_, i) => i !== idx,
                              );
                              setItems(newItems);
                            }}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold shrink-0"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex gap-4 pt-4 mt-4 border-t sticky bottom-0 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            disabled={submitting}
            onClick={handleSave}
            className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

const EditProjectsOrderModal = ({
  data,
  onClose,
}: {
  data: Project[];
  onClose: () => void;
}) => {
  const [items, setItems] = useState<Project[]>(data);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const order = items.map((p) => p.id);
      await setDoc(
        doc(db, "portfolio_data", "main"),
        { projectOrder: order },
        { merge: true },
      );
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio_data");
    }
    setSubmitting(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-2xl font-bold">編輯作品順序</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="projects">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 overflow-y-auto flex-1 pr-2"
              >
                {items.map((item, idx) => (
                  <Draggable key={item.id} draggableId={item.id} index={idx}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border relative"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-slate-400 hover:text-slate-600 cursor-grab px-2 shrink-0"
                        >
                          <GripVertical size={20} />
                        </div>
                        <img
                          src={getDirectImageUrl(item.image)}
                          className="w-16 h-12 object-cover rounded-md"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-bold flex-1 truncate">
                          {item.title}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex gap-4 pt-4 mt-4 border-t sticky bottom-0 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            disabled={submitting}
            onClick={handleSave}
            className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectDetailsModal = ({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) => {
  if (!project) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/80 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-none shadow-2xl relative flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-md hover:bg-white transition-colors"
        >
          <X size={24} className="text-stone-900" />
        </button>

        <div className="md:w-1/2 min-h-[300px] md:min-h-full relative bg-stone-100 flex-shrink-0">
          <img
            src={getDirectImageUrl(project.image)}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col">
          <div className="flex gap-2 flex-wrap mb-6">
            {project.tags?.map((tag) => (
              <span
                key={tag}
                className="text-stone-400 text-[10px] font-mono uppercase tracking-widest border border-stone-200 px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="text-3xl md:text-4xl font-serif font-black mb-6 text-stone-900 tracking-widest">
            {project.title}
          </h3>

          <p className="text-stone-600 text-sm md:text-base mb-10 leading-loose mx-0">
            {project.description}
          </p>

          {project.features && project.features.length > 0 && (
            <div className="mb-10">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-stone-900 mb-6 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Sparkles size={14} /> 專案特色
              </h4>
              <ul className="space-y-4">
                {project.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex gap-4 text-stone-600 text-sm font-serif"
                  >
                    <span className="text-stone-300 font-mono">0{idx + 1}</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto pt-8 flex flex-col sm:flex-row gap-4 items-center w-full">
            {project.link && project.link !== "#" ? (
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-stone-900 text-white font-mono text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors"
              >
                前往專案 <ExternalLink size={16} />
              </a>
            ) : null}
            {project.achievement && (
              <div className="flex items-center gap-3 w-full py-4 text-stone-500 font-mono text-xs uppercase tracking-widest">
                <Award size={16} className="text-stone-400" />
                {project.achievement}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditAbout, setShowEditAbout] = useState(false);
  const [showEditSkills, setShowEditSkills] = useState(false);
  const [showEditAchievements, setShowEditAchievements] = useState(false);
  const [showEditFooter, setShowEditFooter] = useState(false);
  const [showEditProjectsOrder, setShowEditProjectsOrder] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const isAdmin = checkIsAdmin(user);

  useEffect(() => {
    const docRef = doc(db, "portfolio_data", "main");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setContent(docSnap.data());
        } else {
          setContent({});
        }
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const profileData = content?.profile || DEFAULT_PROFILE;
  const footerData = content?.footer || DEFAULT_FOOTER;
  const aboutData = content?.about || DEFAULT_ABOUT;
  const skillsData = content?.skills || DEFAULT_SKILLS;
  const achievementsData = content?.achievements || DEFAULT_ACHIEVEMENTS;

  const deletedProjects = content?.deletedProjects || [];
  const displayProjects = [
    ...projects,
    ...DEFAULT_PROJECTS.filter((p) => !deletedProjects.includes(p.id)),
  ];

  const projectOrder = content?.projectOrder || [];
  const sortedProjects = [...displayProjects].sort((a, b) => {
    const aIndex = projectOrder.indexOf(a.id);
    const bIndex = projectOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const allTags = Array.from(
    new Set(sortedProjects.flatMap((p) => p.tags || [])),
  ).sort();

  const filteredProjects = selectedTag
    ? sortedProjects.filter((p) => p.tags?.includes(selectedTag))
    : sortedProjects;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedProjects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];
        setProjects(fetchedProjects);
      },
      (error) => {
        // It will throw permission denied if projects are only readable by someone, but their rule is read: if true
        console.error(error);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteProject = async (projectId: string) => {
    try {
      if (["1", "2", "3"].includes(projectId)) {
        await setDoc(
          doc(db, "portfolio_data", "main"),
          { deletedProjects: arrayUnion(projectId) },
          { merge: true },
        );
      } else {
        await deleteDoc(doc(db, "projects", projectId));
      }
    } catch (error: any) {
      console.error("Delete failed:", error);
      handleFirestoreError(error, OperationType.DELETE, "projects");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-stone-300 border-t-stone-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 scroll-smooth">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl md:text-2xl font-serif font-black tracking-[0.2em] uppercase"
          >
            Portfolio.
          </motion.span>
          <div className="hidden md:flex gap-10 text-xs font-mono uppercase tracking-[0.1em] text-stone-500">
            {[
              { id: "about", name: "About" },
              { id: "skills", name: "Skills" },
              { id: "achievements", name: "Awards" },
              { id: "works", name: "Works" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="hover:text-stone-900 transition-colors relative group py-2"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-stone-900 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh]">
        {isAdmin && (
          <div className="absolute top-24 right-6 z-50">
            <button
              onClick={() => setShowEditProfile(true)}
              className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors shadow"
            >
              編輯基本資料
            </button>
          </div>
        )}

        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 border border-stone-200 rounded-full blur-[2px] opacity-40 -z-10" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 border border-stone-300 rounded-full blur-[4px] opacity-30 -z-10" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mb-16 relative"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 border border-stone-300 text-stone-600 text-xs font-mono uppercase tracking-[0.2em] mb-4 bg-white/50 backdrop-blur-sm">
              <Sparkles size={14} className="text-stone-400" /> 2026 廣告設計科
            </div>

            <h1 className="text-5xl md:text-[6rem] font-serif font-black tracking-widest text-stone-900 leading-tight">
              <span className="block mb-2 overflow-hidden">
                <motion.span
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.7,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                  className="inline-block title-text"
                >
                  設計，是
                </motion.span>
              </span>
              <span className="block text-stone-400 overflow-hidden">
                <motion.span
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{
                    delay: 0.2,
                    duration: 0.7,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                  className="inline-block relative"
                >
                  看見問題的藝術
                  <span className="absolute -bottom-1 left-0 w-full h-[6px] bg-stone-900 opacity-20" />
                </motion.span>
              </span>
            </h1>

            <p className="text-lg md:text-xl font-serif text-stone-600 max-w-2xl mx-auto leading-relaxed mt-10 tracking-[0.1em]">
              你好，我是{profileData.name}。
              <br />
              專注於{" "}
              <span className="text-stone-900 font-bold border-b border-stone-400 pb-1">
                {profileData.tagline}
              </span>{" "}
              與{" "}
              <span className="text-stone-900 font-bold border-b border-stone-400 pb-1">
                {profileData.tagline2}
              </span>
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="w-48 h-64 md:w-56 md:h-72 border-[8px] border-white shadow-2xl overflow-hidden relative group filter grayscale hover:grayscale-0 transition-all duration-700 z-20 rotate-3 hover:rotate-0 flex-shrink-0"
            >
              <img
                src={getDirectImageUrl(profileData.photoUrl)}
                alt="Profile"
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-1000"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-4 text-left"
            >
              <a
                href="#works"
                className="px-10 py-4 bg-stone-900 text-stone-50 text-sm tracking-[0.2em] uppercase font-bold hover:bg-stone-800 transition-all shadow-xl hover:-translate-y-1 text-center"
              >
                Review Works
              </a>
              <a
                href="#achievements"
                className="px-10 py-4 bg-transparent border border-stone-300 text-stone-700 text-sm tracking-[0.2em] font-bold uppercase transition-all flex items-center justify-center gap-3 hover:bg-white hover:-translate-y-1"
              >
                <Award size={18} /> Credentials
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-20 space-y-40">
        {/* About Section */}
        <section className="pb-32 relative">
          <SectionHeading icon={User} id="about">
            自我介紹 (About Me)
          </SectionHeading>
          {isAdmin && (
            <div className="absolute top-0 right-0 mt-2">
              <button
                onClick={() => setShowEditAbout(true)}
                className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors"
              >
                編輯自我介紹
              </button>
            </div>
          )}
          <div className="grid lg:grid-cols-5 gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 space-y-8"
            >
              <div className="prose prose-slate prose-lg max-w-none text-slate-600">
                {aboutData.paragraphs.map((p: string, idx: number) => (
                  <p
                    key={idx}
                    className={
                      idx === 0
                        ? "text-xl font-medium text-slate-900 leading-snug mb-6"
                        : ""
                    }
                  >
                    {p}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {aboutData.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:col-span-2 grid grid-cols-2 gap-4"
            >
              {[
                { icon: Layout, label: "平面設計" },
                { icon: Monitor, label: "UI/UX" },
                { icon: Terminal, label: "影音剪輯" },
                { icon: Sparkles, label: "視覺藝術" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-stone-200 p-8 flex flex-col items-center justify-center gap-4 text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-stone-400 group"
                >
                  <item.icon
                    size={36}
                    className="text-stone-300 group-hover:text-stone-900 transition-colors duration-500 rotate-0 group-hover:rotate-12"
                    strokeWidth={1}
                  />
                  <span className="font-serif font-bold tracking-widest text-stone-900">
                    {item.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Skills Section */}
        <section className="py-32 relative">
          <SectionHeading icon={Code} id="skills">
            專業專長 (Technical Skills)
          </SectionHeading>
          {isAdmin && (
            <div className="absolute top-32 right-0 mt-2">
              <button
                onClick={() => setShowEditSkills(true)}
                className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors"
              >
                編輯專業專長
              </button>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-10 mt-8">
            {[
              { cat: "Graphic", title: "平面與視覺設計", icon: Layout },
              { cat: "UXUI", title: "UI/UX 與數位產品", icon: Monitor },
              { cat: "Media", title: "影音剪輯與其他", icon: Terminal },
            ].map((category) => (
              <motion.div
                key={category.cat}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white p-10 border border-stone-200 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden group hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 p-4 text-stone-100 group-hover:text-stone-200 transition-colors -z-0">
                  <category.icon
                    size={160}
                    strokeWidth={0.5}
                    className="-rotate-12 transform group-hover:rotate-0 transition-transform duration-700"
                  />
                </div>
                <h3 className="text-2xl font-serif font-black mb-10 text-stone-900 relative z-10 tracking-widest uppercase">
                  {category.title}
                </h3>
                <div className="space-y-8 relative z-10">
                  {skillsData
                    .filter(
                      (s: Skill) =>
                        s.category === category.cat ||
                        (category.cat === "Media" && s.category === "Other"),
                    )
                    .map((skill: Skill) => (
                      <div key={skill.name} className="group/skill">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold text-stone-700 tracking-widest uppercase">
                            {skill.name}
                          </span>
                          <span className="text-xs font-mono text-stone-400">
                            {skill.level}/5
                          </span>
                        </div>
                        <div className="h-[2px] w-full bg-stone-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{
                              width: `${(skill.level / 5) * 100}%`,
                            }}
                            transition={{
                              duration: 1.2,
                              ease: [0.23, 1, 0.32, 1],
                            }}
                            className="h-full bg-stone-900"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Achievements Section */}
        <section className="py-32 relative">
          <SectionHeading icon={GraduationCap} id="achievements">
            課程與成就 (Academic & Learning)
          </SectionHeading>
          {isAdmin && (
            <div className="absolute top-32 right-0 mt-2">
              <button
                onClick={() => setShowEditAchievements(true)}
                className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors"
              >
                編輯成就與課程
              </button>
            </div>
          )}
          <div className="grid gap-6 mt-8">
            {achievementsData.map((item: Achievement, idx: number) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group bg-white p-8 border-b border-stone-200 hover:bg-stone-50 transition-all flex flex-col md:flex-row md:items-start gap-8 relative overflow-hidden"
              >
                <div className="shrink-0 pt-1">
                  <div className="w-12 h-12 border border-stone-300 flex items-center justify-center bg-white text-stone-900 group-hover:bg-stone-900 group-hover:text-white transition-colors duration-500">
                    {item.type === "Award" ? (
                      <Sparkles size={18} />
                    ) : item.type === "Course" ? (
                      <BookOpen size={18} />
                    ) : (
                      <Award size={18} />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <span className="px-3 py-1 bg-white border border-stone-300 text-stone-900 text-[10px] font-mono tracking-widest uppercase">
                      {item.date}
                    </span>
                    <h3 className="text-2xl font-serif font-black text-stone-900 tracking-widest group-hover:pl-2 transition-all duration-300">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-stone-600 font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-stone-400" />
                    {item.organization}
                  </p>
                  <p className="text-stone-500 text-base leading-relaxed max-w-3xl font-serif">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Works Section */}
        <section className="py-32 relative">
          <SectionHeading icon={Briefcase} id="works">
            作品特色介紹 (Portfolio Showcase)
          </SectionHeading>

          {isAdmin && (
            <div className="absolute top-32 right-0 flex items-center gap-4 z-20">
              <button
                onClick={() => setShowEditProjectsOrder(true)}
                className="px-6 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 border border-stone-200"
              >
                編輯順序
              </button>
              <button
                onClick={() => setShowAddProject(true)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <span className="text-lg">+</span> 新增作品專案
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-12 justify-center max-w-4xl mx-auto z-10 relative">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all focus:outline-none ${!selectedTag ? "bg-stone-800 text-white shadow-md scale-105" : "bg-white text-stone-600 hover:bg-stone-100 shadow-sm border border-stone-200"}`}
            >
              全部作品
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all focus:outline-none ${selectedTag === tag ? "bg-stone-800 text-white shadow-md scale-105" : "bg-white text-stone-600 hover:bg-stone-100 shadow-sm border border-stone-200"}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-10 mt-12">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col bg-white overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-700 group relative border border-stone-200"
              >
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  >
                    ✕
                  </button>
                )}
                <div className="aspect-[14/10] relative overflow-hidden bg-stone-100">
                  <img
                    src={getDirectImageUrl(project.image)}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 filter grayscale-[50%] hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-10 flex-1 flex flex-col items-center text-center bg-white border-t border-stone-200">
                  <div className="flex gap-2 flex-wrap justify-center mb-6">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-stone-400 text-[10px] font-mono uppercase tracking-widest"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-serif font-black mb-6 text-stone-900 tracking-widest">
                    {project.title}
                  </h3>
                  <p className="text-stone-500 text-sm mb-10 leading-relaxed font-serif">
                    {project.description}
                  </p>

                  <div className="mt-auto space-y-8 w-full">
                    {project.achievement && (
                      <div className="py-3 border-y border-stone-200 flex items-center justify-center gap-3">
                        <Sparkles
                          size={14}
                          className="text-stone-400 shrink-0"
                        />
                        <p className="text-xs font-mono tracking-widest text-stone-600 uppercase">
                          {project.achievement}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedProject(project)}
                      className="inline-flex items-center justify-center gap-3 py-4 w-full bg-stone-900 text-white font-mono text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors group/btn cursor-pointer"
                    >
                      View Details{" "}
                      <ExternalLink
                        size={14}
                        className="transition-transform group-hover/btn:translate-x-1"
                        strokeWidth={1.5}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-24 border-t border-stone-200 bg-stone-100 relative overflow-hidden group/footer">
        {isAdmin && (
          <div className="absolute top-24 right-6 z-50 opacity-0 group-hover/footer:opacity-100 transition-opacity">
            <button
              onClick={() => setShowEditFooter(true)}
              className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors shadow"
            >
              編輯頁尾
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-12 relative z-10">
          <div className="text-center">
            <span className="text-3xl md:text-5xl font-serif font-black text-stone-900 tracking-[0.2em] uppercase block mb-6">
              {footerData.copyrightTitle}
            </span>
            <p className="text-stone-500 font-mono text-xs tracking-widest mb-6 uppercase">
              {footerData.copyrightText}
            </p>
            <AdminLogin user={user} />
          </div>
        </div>
      </footer>

      {showAddProject && (
        <AddProjectForm onClose={() => setShowAddProject(false)} />
      )}
      {showEditProjectsOrder && (
        <EditProjectsOrderModal
          data={sortedProjects}
          onClose={() => setShowEditProjectsOrder(false)}
        />
      )}
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
      {showEditProfile && (
        <EditProfileModal
          data={profileData}
          onClose={() => setShowEditProfile(false)}
        />
      )}
      {showEditAbout && (
        <EditAboutModal
          data={aboutData}
          onClose={() => setShowEditAbout(false)}
        />
      )}
      {showEditSkills && (
        <EditSkillsModal
          data={skillsData}
          onClose={() => setShowEditSkills(false)}
        />
      )}
      {showEditAchievements && (
        <EditAchievementsModal
          data={achievementsData}
          onClose={() => setShowEditAchievements(false)}
        />
      )}
      {showEditFooter && (
        <EditFooterModal
          data={footerData}
          onClose={() => setShowEditFooter(false)}
        />
      )}
    </div>
  );
}
