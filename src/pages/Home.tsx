import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Users, Calculator, ArrowRight, GraduationCap, CalendarRange, 
  BookCopy, Zap, ShieldCheck, Smartphone, CheckCircle2, ChevronDown, BookOpen, Calendar, Hash, Bell, RefreshCw
} from 'lucide-react';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Helmet } from 'react-helmet-async';

export default function Home() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<{ url: string; link: string } | null>(null);
  
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (isMounted && docSnap.exists()) {
          const data = docSnap.data();
          if (data.bannerUrl) {
            setBanner({ url: data.bannerUrl, link: data.bannerLink || '' });
          }
        }
      } catch (error) {
        // Silently ignore offline error for settings fetch
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const notices = [
    { title: "Diploma in Engineering 4th, 6th & 8th Semester Results Published", date: "Today" },
    { title: "Diploma in Textile Board Challenge Notice 2026", date: "Yesterday" },
    { title: "Update on 2025 Semester Grade Calculations", date: "3 Days Ago" },
  ];

  const faqs = [
    { q: "How to check BTEB diploma result online quickly?", a: "Enter your official roll number, select your curriculum (e.g., Diploma in Engineering) and regulation, and click search. Our dedicated archive fetches your result instantly without server-side lag." },
    { q: "What is 'Referred' in a polytechnic semester result?", a: "A 'Referred' status means you did not pass one or more specific subjects in the semester. You will need to retake the exams for those subjects in the upcoming board exams." },
    { q: "How does the BTEB CGPA Calculator work?", a: "Our CGPA (Cumulative Grade Point Average) Calculator uses the official BTEB credit weightage system to automatically convert your semester-wise GPAs into an accurate final CGPA." },
    { q: "Can I check group semester results for my entire department?", a: "Yes. By selecting the 'Group Result' tab, you can input a start and end roll number block to fetch multiple results simultaneously, which is perfect for polytechnic class representatives." },
    { q: "What should I do if my BTEB result is missing or shows 'Not Found'?", a: "First, double-check your roll number and regulation. If it's still missing just after publication, it might be due to temporary board server syncing issues. Try checking again after a while or consult your institute." }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "BTEB Result Archive",
        "url": "https://btebresultlibrary.vercel.app/",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://btebresultlibrary.vercel.app/result?roll={search_term_string}&type=individual",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "EducationalOrganization",
        "name": "BTEB Result Library",
        "logo": "https://btebresultlibrary.vercel.app/favicon.svg"
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      }
    ]
  };

  return (
    <main className="flex flex-col items-center w-full font-sans bg-slate-50 relative overflow-hidden">
      <Helmet>
        <title>BTEB Result Archive | Check Diploma Result BD</title>
        <meta name="description" content="Check Bangladesh Diploma Result instantly online. Fast, mobile-friendly result checker for BTEB polytechnic semester results, plus CGPA tools." />
        <meta name="keywords" content="Diploma Result, Diploma Result 2026, BTEB Result Archive, Polytechnic Semester Result, Diploma in Engineering Result, Bangladesh Result Checker" />
        <link rel="canonical" href="https://btebresultlibrary.vercel.app/" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>



      {/* 1. HERO SECTION */}
      <section className="w-full relative pt-16 pb-28 px-4 sm:px-6 z-10 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-full pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[80px]" />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="text-left z-10 mt-8 lg:mt-0">
            <div className="flex justify-center lg:justify-start">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold mb-8 shadow-sm"
              >
                <Zap className="w-4 h-4 fill-amber-400 text-amber-500" /> Ultra-Low Latency Result Engine
              </motion.div>
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.2] lg:leading-[1.1] mb-6 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left"
            >
              Check Your Diploma Result <br className="hidden sm:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Instantly.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-base sm:text-lg md:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium text-center lg:text-left"
            >
              Skip the server crashes. The fastest, most reliable portal for Bangladeshi polytechnic students to check their diploma results, calculate CGPA, and analyze academic performance.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex justify-center lg:justify-start"
            >
              <button 
                onClick={() => navigate('/individual-results')}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)]"
              >
                Check Your Result <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>

          {/* Illustration Zone */}
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
             className="w-full max-w-[480px] mx-auto lg:mx-0 lg:ml-auto relative z-10 hidden md:flex justify-center items-center"
          >
             <div className="relative w-full aspect-square max-w-[400px]">
                {/* Floating UI Elements Illustration */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/40 to-indigo-50/40 rounded-full blur-[80px]"></div>
                
                <motion.div 
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-1/4 left-0 w-full bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-6 z-20"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="h-3 w-24 bg-slate-200 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-slate-100 rounded-full"></div>
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-emerald-100 rounded-lg flex items-center justify-center border border-emerald-200">
                      <div className="h-2 w-8 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                       <div className="h-full w-3/4 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                       <div className="h-full w-4/5 bg-indigo-500 rounded-full"></div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [10, -10, 10] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="absolute top-1/2 left-1/4 w-[110%] bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-slate-100 p-5 z-30"
                >
                   <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                       <GraduationCap className="w-6 h-6 text-orange-600" />
                     </div>
                     <div className="flex-1">
                       <div className="flex justify-between items-center mb-2">
                         <div className="h-3 w-20 bg-slate-200 rounded-full"></div>
                         <div className="h-4 w-12 bg-emerald-500 rounded-full"></div>
                       </div>
                       <div className="h-2 w-32 bg-slate-100 rounded-full mb-2"></div>
                       <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                     </div>
                   </div>
                </motion.div>
                
                <div className="absolute top-[-10%] right-[-5%] w-24 h-24 bg-yellow-400 rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>
             </div>
          </motion.div>
        </div>
      </section>


      {/* 2. TRUST / AUTHORITY SECTION */}
      <section className="w-full bg-white border-y border-slate-100 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
             <div className="flex -space-x-4">
               {[1,2,3,4].map((i) => (
                 <div key={i} className="w-12 h-12 rounded-full border-[3px] border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i+10}&backgroundColor=e2e8f0`} alt="Polytechnic student avatar" className="w-full h-full object-cover" />
                 </div>
               ))}
               <div className="w-12 h-12 rounded-full border-[3px] border-white bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shadow-sm">+10k</div>
             </div>
             <div>
               <p className="text-sm font-bold text-slate-900">Trusted by Polytechnic Students</p>
               <p className="text-sm text-slate-500">Across all institutions in Bangladesh</p>
             </div>
          </div>
          
          <div className="flex items-center gap-8 sm:gap-12 text-slate-600 overflow-x-auto w-full md:w-auto pb-4 md:pb-0 hide-scrollbar snap-x">
             <div className="flex items-center gap-3 shrink-0 snap-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                   <Zap className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-sm font-semibold">Zero Lag on Result Day</span>
             </div>
             <div className="flex items-center gap-3 shrink-0 snap-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                   <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-semibold">Mobile First Design</span>
             </div>
             <div className="flex items-center gap-3 shrink-0 snap-center">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                   <ShieldCheck className="w-5 h-5 text-indigo-500" />
                </div>
                <span className="text-sm font-semibold">Accurate Data Layout</span>
             </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURE SECTION (SEO KEYWORDS BOOST) */}
      <section className="w-full py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <header className="text-center mb-20 block">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Designed specifically for<br />BTEB students in Bangladesh</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">We built the ideal academic companion to make result tracking, CGPA calculation, and syllabus browsing completely effortless.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
             { title: "Instant Diploma Results", icon: <Search className="w-6 h-6 text-blue-600" />, desc: "Bypass the official site traffic. Check your individual BTEB diploma result in milliseconds with our cached network.", bg: "bg-blue-50" },
             { title: "Smart CGPA Calculator", icon: <Calculator className="w-6 h-6 text-emerald-600" />, desc: "Calculate accurate CGPAs for 2016 and 2022 regulations. Auto-applies standard credit weightages per semester.", bg: "bg-emerald-50" },
             { title: "Group Semester Results", icon: <Users className="w-6 h-6 text-indigo-600" />, desc: "Check entire institute results quickly. Filter passed & failed students, and download complete PDFs effortlessly.", bg: "bg-indigo-50" },
             { title: "Syllabus & Booklists", icon: <BookCopy className="w-6 h-6 text-purple-600" />, desc: "No more hunting for reference books. Access structured BTEB booklists categorized by department and semester.", bg: "bg-purple-50" },
             { title: "Board Exam Routines", icon: <CalendarRange className="w-6 h-6 text-orange-600" />, desc: "Stay prepared. Browse the latest official board exam and practical routines with clear countdowns and HD previews.", bg: "bg-orange-50" },
             { title: "Historical Result Recovery", icon: <RefreshCw className="w-6 h-6 text-pink-600" />, desc: "Missing past results? Our database maintains historical records allowing you to recover lost transcripts easily.", bg: "bg-pink-50" }
          ].map((feature, i) => (
            <article key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed text-base">{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 4. RESULT SEARCH PREVIEW SECTION */}
      <section className="w-full bg-[#0a0f1c] py-32 px-4 sm:px-6 overflow-hidden relative">
        {/* Glowing Orbs */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 right-1/4 translate-y-1/3 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
           <div className="text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-300 text-sm font-bold mb-8 border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] backdrop-blur-md">
               <ShieldCheck className="w-5 h-5 text-blue-400" /> Accurate Subject Grades
             </div>
             
             <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
               Gorgeous Result Cards, <br className="hidden lg:block" />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Clear CGPA Insights.</span>
             </h2>
             
             <p className="text-slate-400 text-lg md:text-xl mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
               We completely re-imagined the standard BTEB result view. See your semester grades mapped out clearly, instantly spot "Referred" subjects with red highlights, and trust the automated CGPA calculations.
             </p>
             
             <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
               <button onClick={() => navigate('/individual-results')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)]">
                 Find Your Roll <ArrowRight className="w-5 h-5" />
               </button>
               <button onClick={() => navigate('/group-results')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/50 text-white border border-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 hover:border-slate-600 transition-all backdrop-blur-sm">
                 Explore Archives
               </button>
             </div>
           </div>
           
           <div className="relative mx-auto w-full max-w-lg lg:max-w-xl">
              {/* Fake UI Card */}
              <div className="relative z-10 bg-white/95 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 transform rotate-2 hover:rotate-0 transition-transform duration-500 will-change-transform">
                <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-8">
                  <div>
                    <div className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Student Dashboard
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">Roll: 981514</div>
                    <div className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" /> Computer Technology
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Total CGPA</div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-emerald-700 tracking-tighter">3.92</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { sub: 'Microprocessor & Microcomputer', code: '66661', mark: 'A+', color: 'text-emerald-700', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { sub: 'System Analysis & Design', code: '66662', mark: 'A', color: 'text-blue-700', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { sub: 'Network Administration', code: '66663', mark: 'F', color: 'text-rose-700', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-shadow group hover:bg-white hover:border-slate-200">
                      <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{s.sub}</div>
                        <div className="text-xs text-slate-400 font-bold font-mono mt-1">{s.code}</div>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border ${s.bg} text-lg shadow-sm`}>{s.mark}</div>
                    </div>
                  ))}
                </div>
                
                {/* Floating highlight for impact */}
                <div className="absolute -left-8 -top-8 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl pointer-events-none"></div>
                
              </div>
           </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section className="w-full py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <header className="text-center mb-20 block">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">How to check BTEB results online?</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">Verify your exact diploma engineering semester scores in four incredibly simple steps.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative">
           {/* Connecting Line */}
           <div className="hidden lg:block absolute top-[4.5rem] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 -z-10" />
           
           {[
             { title: 'Enter Roll Number', desc: 'Type your official 6-digit board roll accurately.', icon: <Hash className="w-6 h-6 text-blue-600" /> },
             { title: 'Select Curriculum', desc: 'Choose between Engineering, Textile, or Agriculture.', icon: <BookOpen className="w-6 h-6 text-blue-600" /> },
             { title: 'Click Search', desc: 'Tap the button and experience zero load times.', icon: <Zap className="w-6 h-6 text-blue-600" /> },
             { title: 'Get Instant Result', desc: 'View, analyze, print, or save a PDF directly.', icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" /> }
           ].map((item, i) => (
             <article key={i} className="text-center group">
                <div className="relative mx-auto w-max mb-8">
                  <div className="absolute inset-0 bg-blue-100 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
                  <div className="w-20 h-20 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mx-auto text-lg relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm border-2 border-white shadow-sm">
                      {i+1}
                    </div>
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-base text-slate-500 leading-relaxed">{item.desc}</p>
             </article>
           ))}
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="w-full bg-slate-100/50 py-24 px-4 sm:px-6 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12 block">
             <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </header>
          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border text-left border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 transition-colors shadow-sm" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 sm:p-8 font-semibold text-slate-900 bg-white text-lg"
                >
                  <span itemProp="name">{faq.q}</span>
                  <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 shrink-0 ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"
                    >
                      <div className="p-6 sm:p-8 pt-0 text-slate-600 text-base leading-relaxed border-t border-slate-50 mt-1" itemProp="text">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SEO CONTENT BLOCK */}
      <article className="w-full py-20 px-4 sm:px-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto prose prose-slate prose-lg text-slate-600 relative">
          <div className="absolute top-0 left-0 w-12 h-1 bg-blue-500 rounded-full mb-8"></div>
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-6">Your Ultimate BTEB Result Library in Bangladesh</h2>
          <p className="mb-6">
            Welcome to the premier digital platform specifically engineered to provide instant access to your <strong>Diploma Result</strong>. The process of searching for a <strong>Diploma in Engineering Result</strong> is now entirely seamless, eliminating the common frustrations of unresponsive servers, extensive loading times, and cluttered interfaces. Operating under the <strong>BTEB Result Library</strong> banner, our streamlined <strong>Polytechnic Result Checker BD</strong> connects directly to secure data repositories, guaranteeing fast and accurate grade retrieval.
          </p>
          <p className="mb-6">
            In addition to rapid result checking, our platform features a highly accurate <strong>CGPA Calculator Bangladesh</strong>, precisely formulated to align with the latest polytechnic and textile engineering syllabus requirements. Whether you need to verify individual performance, analyze group semester outcomes, or explore extensive historical records, our platform stands as the most reliable, high-speed solution exclusively developed for students checking their <strong>BTEB Diploma Result</strong>.
          </p>
        </div>
      </article>

      {/* 8. CTA SECTION */}
      <section className="w-full bg-blue-600 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600 to-blue-800 py-24 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 tracking-tight">Check Your Result in 2 Seconds.</h2>
          <p className="text-blue-100 text-lg sm:text-xl mb-12 font-medium">No CAPTCHAs, no confusing drop-downs. Just pure speed.</p>
          <button 
            onClick={() => navigate('/individual-results')}
            className="inline-flex items-center justify-center gap-3 bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
          >
            <Search className="w-6 h-6" />
            Check Your Result
          </button>
        </div>
      </section>

    </main>
  );
}
