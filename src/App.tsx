import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, addDoc, serverTimestamp, getDocs, orderBy, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { db, auth, handleFirestoreError } from "./lib/firebase";
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
  Sparkles
} from "lucide-react";

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
  category: "Frontend" | "Backend" | "Tools" | "Other";
}

// --- Data (Example - User should replace with their real data) ---
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "1",
    title: "智能學習助理 (Smart Study Assistant)",
    description: "結合大型語言模型的個人化學習管理軟體，協助學生自動化整理繁瑣的學習筆記與進度排程。",
    tags: ["React", "TypeScript", "Tailwind CSS", "Gemini API"],
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop",
    features: [
      "AI 自動生成讀書計畫",
      "語義化搜尋歷史筆記",
      "番茄鐘專注力可視化分析"
    ],
    achievement: "獲得 112 學年度校內專題研究競賽優等",
    link: "#"
  },
  {
    id: "2",
    title: "校園數據感測網路 (Campus IoT Network)",
    description: "部署於校園各處的感測器節點，即時監控空氣品質與光照亮度，並透過儀表板展示環境變化趨勢。",
    tags: ["Arduino", "Python", "Flask", "D3.js"],
    image: "https://images.unsplash.com/photo-1551288049-bbbda536639a?q=80&w=800&auto=format&fit=crop",
    features: [
      "低功耗物聯網通訊協定",
      "即時 WebSocket 數據推播",
      "長達一年的環境歷史大數據存儲"
    ],
    achievement: "代表學校參加全國中小學科學展覽會",
    link: "#"
  },
  {
    id: "3",
    title: "跨平台開源筆記外掛 (Open Source Note Plugin)",
    description: "為多款主流筆記軟體開發的 Markdown 渲染增強工具，並在 GitHub 上獲得超過 100 顆星星。",
    tags: ["JavaScript", "Rust", "WebAssembly"],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    features: [
      "極速 Rust 渲染引擎",
      "全客製化 CSS 佈景主題",
      "跨裝置配置即時同步"
    ],
    link: "https://github.com"
  }
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    title: "全國高級中等學校小論文獎 - 特優",
    organization: "教育部",
    date: "2024",
    description: "研究主題：《探討深度學習於國文文言文翻譯之準確性分析》。",
    type: "Award"
  },
  {
    id: "a2",
    title: "CS50: Introduction to Computer Science",
    organization: "Harvard University (Online)",
    date: "2023",
    description: "完成為期 12 週的電腦科學入門課程，掌握 C, Python, SQL 等跨領域開發能力。",
    type: "Course"
  },
  {
    id: "a3",
    title: "APCS 指標性測驗 - 實作 4 級 / 觀念 4 級",
    organization: "國立臺灣師範大學",
    date: "2023",
    description: "於全國性大學入學程式設計能力檢定中獲得頂尖級別成績。",
    type: "Certificate"
  }
];

const SKILLS: Skill[] = [
  { name: "React / Vite / Tailwind", level: 5, category: "Frontend" },
  { name: "TypeScript / ES6+", level: 4, category: "Frontend" },
  { name: "Python / Data Analysis", level: 4, category: "Backend" },
  { name: "UI/UX Design Concept", level: 3, category: "Other" },
  { name: "Node.js / Express / Firebase", level: 4, category: "Backend" },
  { name: "Git / GitHub Version Control", level: 5, category: "Tools" },
];

// --- Sub-components ---

const SectionHeading = ({ children, icon: Icon, id }: { children: React.ReactNode, icon: any, id: string }) => (
  <motion.div 
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex items-center gap-3 mb-12 scroll-mt-24"
  >
    <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
      <Icon size={28} />
    </div>
    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{children}</h2>
    <div className="flex-1 h-[2px] bg-slate-100 ml-4 hidden md:block"></div>
  </motion.div>
);

const ContactForm = () => {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      await addDoc(collection(db, "messages"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md mx-auto w-full text-left bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20">
      {status === "success" ? (
        <div className="text-center py-10">
          <h4 className="text-2xl font-bold mb-2">謝謝你的訊息！</h4>
          <p className="text-blue-100">我將會盡快與您聯繫。</p>
          <button onClick={() => setStatus("idle")} className="mt-6 text-sm underline text-blue-200">再傳一則</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-100">你的名字</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/50 text-white placeholder-white/30 transition-colors" placeholder="王小明" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-100">電子信箱</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/50 text-white placeholder-white/30 transition-colors" placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-100">訊息內容</label>
            <textarea required rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/50 text-white placeholder-white/30 transition-colors resize-none" placeholder="我想更進一步了解你的專案..."></textarea>
          </div>
          <button disabled={status === "submitting"} type="submit" className="w-full py-4 bg-white text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-colors disabled:opacity-50">
            {status === "submitting" ? "傳送中..." : "送出訊息"}
          </button>
          {status === "error" && <p className="text-red-300 text-sm mt-2">發生錯誤，請稍後再試。</p>}
        </form>
      )}
    </div>
  );
};

const AdminLogin = ({ user }: { user: FirebaseUser | null }) => {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  if (user) {
    if (user.email !== 'lou0972875947@gmail.com') {
       return <span className="text-red-500 text-xs">非管理員帳號</span>;
    }
    return (
      <button onClick={() => signOut(auth)} className="text-xs text-blue-500 underline">
        登出管理員
      </button>
    );
  }

  return (
    <button onClick={handleLogin} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
      Admin Login
    </button>
  );
}

const AddProjectForm = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    title: "", description: "", image: "", link: "", achievement: "", tags: "", features: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, "projects"), {
        title: formData.title,
        description: formData.description,
        image: formData.image || "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop",
        link: formData.link || "",
        achievement: formData.achievement || "",
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        features: formData.features.split("\n").map(f => f.trim()).filter(Boolean),
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
       handleFirestoreError(error, 'create' as any, 'projects');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">新增作品專案</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">作品名稱</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">作品簡介</label>
            <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-xl resize-none"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">標籤 (用逗號分隔)</label>
            <input required type="text" value={formData.tags} placeholder="React, TypeScript, CSS" onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">圖片網址</label>
            <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">作品連結 (選填)</label>
            <input type="text" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">成就/獎項 (選填)</label>
            <input type="text" value={formData.achievement} onChange={e => setFormData({...formData, achievement: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">核心技術亮點 (每行一個)</label>
            <textarea required rows={4} value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} className="w-full px-4 py-2 border rounded-xl resize-none"></textarea>
          </div>
          
          <div className="flex gap-4 pt-4 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl border text-slate-600 hover:bg-slate-50">取消</button>
            <button disabled={submitting} type="submit" className="flex-1 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "新增中..." : "新增作品"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [showAddProject, setShowAddProject] = useState(false);
  const isAdmin = user?.email === 'lou0972875947@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedProjects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        setProjects(fetchedProjects);
      } else {
        setProjects(DEFAULT_PROJECTS);
      }
    }, (error) => {
      // It will throw permission denied if projects are only readable by someone, but their rule is read: if true
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("確定要刪除這個作品嗎？")) return;
    try {
      await deleteDoc(doc(db, "projects", projectId));
    } catch (error) {
       handleFirestoreError(error, 'delete' as any, 'projects');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 scroll-smooth">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-bold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          >
            My Showcase
          </motion.span>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-500">
            {[
              { id: 'about', name: '自我介紹' },
              { id: 'skills', name: '專長技術' },
              { id: 'achievements', name: '課程與成就' },
              { id: 'works', name: '作品集' },
              { id: 'contact', name: '聯絡方式' }
            ].map((item) => (
              <a 
                key={item.id} 
                href={`#${item.id}`} 
                className="hover:text-blue-600 transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-40 h-40 rounded-3xl bg-linear-to-br from-blue-500 to-indigo-600 p-1 mb-10 rotate-3 animate-pulse-slow"
          >
            <div className="w-full h-full rounded-[1.3rem] bg-white flex items-center justify-center overflow-hidden">
              <User size={80} className="text-slate-200" />
              {/* Replace with actual profile image src in production */}
              {/* <img src="/profile.jpg" className="w-full h-full object-cover" /> */}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
              <Sparkles size={14} /> 2026 升大學作品集
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">
              你好，我是 <span className="text-blue-600">王小明</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
              一個熱衷於解決問題的高中工程師。專注於 <span className="text-slate-800 font-semibold underline decoration-blue-500 decoration-2 underline-offset-4">網頁全棧開發</span> 與 <span className="text-slate-800 font-semibold underline decoration-indigo-500 decoration-2 underline-offset-4">數據科學助理</span>。
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <a href="#works" className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              查看作品集
            </a>
            <a href="#achievements" className="px-10 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
              <Award size={20} /> 成就證明
            </a>
          </motion.div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-20 divide-y divide-slate-100">
        
        {/* About Section */}
        <section className="pb-32">
          <SectionHeading icon={User} id="about">自我介紹 (About Me)</SectionHeading>
          <div className="grid lg:grid-cols-5 gap-16 items-start">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 space-y-8"
            >
              <div className="prose prose-slate prose-lg max-w-none text-slate-600">
                <p className="text-xl font-medium text-slate-900 leading-snug mb-6">
                  我目前就讀於台北市立某某高中，我對技術的熱情源自於對「未知」的好奇，以及對「創造」的渴望。
                </p>
                <p>
                  自國三 接觸 Python 起，我便被程式碼能夠將抽象構思轉換為具體工具的力量所吸引。我不只是在學習語法，更是在學習一種「解決問題的思維方式」。
                </p>
                <p>
                  在高中三年的探索中，我發現自己不僅擅長邏輯分析，也對人類與技術的互動（UI/UX）深邃感興趣。我曾多次主導校內科展小組，擔任過資研社幹部，這些經歷磨練了我的溝通與專案管理能力。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {['問題解決導向', '快速學習力', '跨團隊溝通', '熱愛開源分享'].map(tag => (
                  <span key={tag} className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">
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
                { icon: Monitor, label: "前端工程", color: "bg-blue-50 text-blue-600" },
                { icon: Database, label: "數據分析", color: "bg-indigo-50 text-indigo-600" },
                { icon: Terminal, label: "核心算法", color: "bg-slate-900 text-white" },
                { icon: Layout, label: "產品設計", color: "bg-orange-50 text-orange-600" }
              ].map((item, idx) => (
                <div key={idx} className={`${item.color} p-8 rounded-3xl flex flex-col items-center gap-3 text-center transition-all hover:shadow-lg hover:-translate-y-1`}>
                  <item.icon size={36} />
                  <span className="font-bold tracking-tight">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Skills Section */}
        <section className="py-32">
          <SectionHeading icon={Code} id="skills">專業專長 (Technical Skills)</SectionHeading>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { cat: 'Frontend', title: '前端介面開發', icon: Layout },
              { cat: 'Backend', title: '後端與數據分析', icon: Database },
              { cat: 'Tools', title: '開發工具與其他', icon: Terminal }
            ].map((category) => (
              <motion.div 
                key={category.cat}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 text-slate-50 group-hover:text-slate-100 transition-colors">
                  <category.icon size={120} />
                </div>
                <h3 className="text-2xl font-bold mb-8 text-slate-900 relative">{category.title}</h3>
                <div className="space-y-8 relative">
                  {SKILLS.filter(s => s.category === category.cat || (category.cat === 'Tools' && s.category === 'Other')).map((skill) => (
                    <div key={skill.name}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700 tracking-tight">{skill.name}</span>
                        <span className="text-xs font-mono text-slate-400">{skill.level}/5</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(skill.level / 5) * 100}%` }}
                          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full bg-blue-500 rounded-full"
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
        <section className="py-32">
          <SectionHeading icon={GraduationCap} id="achievements">課程與成就 (Academic & Learning)</SectionHeading>
          <div className="grid gap-6">
            {ACHIEVEMENTS.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col md:flex-row md:items-start gap-8"
              >
                <div className="shrink-0 pt-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.type === 'Award' ? 'bg-orange-50 text-orange-500' : item.type === 'Course' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                    {item.type === 'Award' ? <Sparkles /> : item.type === 'Course' ? <BookOpen /> : <Award />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest leading-none">
                      {item.date}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-blue-600 font-bold mb-3 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-blue-600 rounded-full" />
                    {item.organization}
                  </p>
                  <p className="text-slate-500 text-lg leading-relaxed">{item.description}</p>
                </div>
                <div className="self-end md:self-center shrink-0">
                  <div className="p-3 rounded-full border border-slate-100 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Works Section */}
        <section className="py-32 relative">
          <SectionHeading icon={Briefcase} id="works">作品特色介紹 (Portfolio Showcase)</SectionHeading>
          
          {isAdmin && (
            <div className="absolute top-32 right-0">
               <button onClick={() => setShowAddProject(true)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
                 <span className="text-lg">+</span> 新增作品專案
               </button>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-10 mt-8">
            {projects.map((project) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative"
              >
                {isAdmin && (
                  <button onClick={() => handleDeleteProject(project.id)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md">
                    ✕
                  </button>
                )}
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <div className="flex gap-2 flex-wrap">
                      {project.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-10 flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold mb-4 text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{project.title}</h3>
                  <p className="text-slate-500 text-base mb-8 leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div className="mt-auto space-y-8">
                    {project.achievement && (
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                        <Sparkles size={18} className="text-orange-500 shrink-0 mt-1" />
                        <p className="text-sm font-bold text-orange-900">{project.achievement}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">核心技術亮點</p>
                      <ul className="space-y-3">
                        {project.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <a 
                      href={project.link} 
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-slate-50 text-slate-900 font-bold text-sm hover:bg-blue-600 hover:text-white transition-all group/btn"
                    >
                      專案詳情 <ExternalLink size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-32">
          <div id="contact" className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 md:p-24 text-white text-center relative overflow-hidden">
            {/* Animated Circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            <SectionHeading icon={Mail} id="contact-head"><span className="text-white border-white">聯絡方式 (Contact)</span></SectionHeading>
            
            <p className="text-blue-100 text-xl mb-16 max-w-2xl mx-auto font-medium leading-relaxed">
              我正在尋找大學階段的學術指導與實習機會。如果您對我的背景感興趣，或是想要更深入了解我的作品與專題，請隨時與我聯繫。
            </p>
            
            <div className="flex flex-col md:flex-row justify-center items-start gap-12">
              <div className="flex-1 space-y-8 flex items-center justify-center pt-8">
                <div className="flex flex-col gap-6">
                  {[
                    { icon: Github, label: 'GitHub', href: '#' },
                    { icon: Linkedin, label: 'LinkedIn', href: '#' },
                    { icon: Mail, label: 'Email', href: 'mailto:example@email.com' }
                  ].map(social => (
                    <a 
                      key={social.label}
                      href={social.href}
                      className="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all group"
                      title={social.label}
                    >
                      <social.icon size={28} className="group-hover:scale-110 transition-transform" />
                      <span className="text-lg font-bold tracking-wide">{social.label}</span>
                    </a>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 w-full relative z-10">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <span className="text-xl font-black bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block mb-2">Wang Xiao-Ming</span>
            <p className="text-slate-400 text-sm font-medium mb-2">© 2024 Personal Showcase. All rights reserved.</p>
            <AdminLogin user={user} />
          </div>
          <p className="text-slate-300 text-xs font-mono max-w-xs text-center md:text-right">
            Designed for University Admission Portfolio. Developed with React & Tailwind CSS.
          </p>
        </div>
      </footer>

      {showAddProject && <AddProjectForm onClose={() => setShowAddProject(false)} />}
    </div>
  );
}
