import { useState, useEffect, useMemo } from "react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  BookCopy,
  Printer,
  ChevronRight,
  BookOpen,
  Layers,
  GraduationCap,
  Building2,
  Download,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { useSearchParams } from "react-router-dom";
import SeoBlocks from "../components/SeoBlocks";

export default function Booklists() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCurriculum = searchParams.get("curriculum") || null;
  const activeRegulation = searchParams.get("regulation") || null;
  const activeSemester = searchParams.get("semester") || null;
  const activeDepartment = searchParams.get("department") || null;

  const setActiveFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // If a higher-level filter changes, clear the lower ones
    if (key === "curriculum") {
      newParams.delete("regulation");
      newParams.delete("semester");
      newParams.delete("department");
    } else if (key === "regulation") {
      newParams.delete("semester");
      newParams.delete("department");
    } else if (key === "semester") {
      newParams.delete("department");
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const fetchBooklists = async () => {
    try {
      const q = query(collection(db, "booklists"), limit(2000));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBooklists(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const curriculums = useMemo(
    () =>
      Array.from(
        new Set(booklists.map((b) => b.curriculum || "Unknown")),
      ).sort(),
    [booklists],
  );

  const regulations = useMemo(() => {
    if (!activeCurriculum) return [];
    return Array.from(
      new Set(
        booklists
          .filter((b) => (b.curriculum || "Unknown") === activeCurriculum)
          .map((b) => b.regulation || "Unknown"),
      ),
    )
      .sort()
      .reverse();
  }, [booklists, activeCurriculum]);

  const semesters = useMemo(() => {
    if (!activeCurriculum || !activeRegulation) return [];
    return Array.from(
      new Set(
        booklists
          .filter(
            (b) =>
              (b.curriculum || "Unknown") === activeCurriculum &&
              (b.regulation || "Unknown") === activeRegulation,
          )
          .map((b) => b.semester || "Unknown"),
      ),
    ).sort();
  }, [booklists, activeCurriculum, activeRegulation]);

  const departments = useMemo(() => {
    if (!activeCurriculum || !activeRegulation || !activeSemester) return [];
    return Array.from(
      new Set(
        booklists
          .filter(
            (b) =>
              (b.curriculum || "Unknown") === activeCurriculum &&
              (b.regulation || "Unknown") === activeRegulation &&
              (b.semester || "Unknown") === activeSemester,
          )
          .map((b) => b.department || "Unknown"),
      ),
    ).sort();
  }, [booklists, activeCurriculum, activeRegulation, activeSemester]);

  const filteredSubjects = useMemo(() => {
    if (
      !activeCurriculum ||
      !activeRegulation ||
      !activeSemester ||
      !activeDepartment
    )
      return [];
    return booklists.filter(
      (b) =>
        (b.curriculum || "Unknown") === activeCurriculum &&
        (b.regulation || "Unknown") === activeRegulation &&
        (b.semester || "Unknown") === activeSemester &&
        ((b.department || "Unknown") === activeDepartment || (b.department === "All Department"))
    );
  }, [
    booklists,
    activeCurriculum,
    activeRegulation,
    activeSemester,
    activeDepartment,
  ]);

  // Auto-select if only one option available
  useEffect(() => {
    if (curriculums.length === 1 && !activeCurriculum)
      setActiveFilter("curriculum", curriculums[0]);
  }, [curriculums, activeCurriculum]);

  useEffect(() => {
    if (regulations.length === 1 && !activeRegulation)
      setActiveFilter("regulation", regulations[0]);
    else if (
      activeCurriculum &&
      regulations.length > 0 &&
      !regulations.includes(activeRegulation || "")
    ) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("regulation");
      setSearchParams(newParams);
    }
  }, [regulations, activeRegulation, activeCurriculum, searchParams]);

  useEffect(() => {
    if (semesters.length === 1 && !activeSemester)
      setActiveFilter("semester", semesters[0]);
    else if (
      activeRegulation &&
      semesters.length > 0 &&
      !semesters.includes(activeSemester || "")
    ) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("semester");
      setSearchParams(newParams);
    }
  }, [semesters, activeSemester, activeRegulation, searchParams]);

  useEffect(() => {
    if (departments.length === 1 && !activeDepartment)
      setActiveFilter("department", departments[0]);
    else if (
      activeSemester &&
      departments.length > 0 &&
      !departments.includes(activeDepartment || "")
    ) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("department");
      setSearchParams(newParams);
    }
  }, [departments, activeDepartment, activeSemester, searchParams]);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Booklist for ${activeDepartment} - ${activeSemester} Semester`,
          url: window.location.href,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleDownloadPNG = () => generateImageAndDownload('jpg');
  const handlePrint = () => generateImageAndDownload('pdf');

  const generateImageAndDownload = async (type: 'pdf' | 'jpg') => {
    const printContent = document.getElementById("booklist-card");
    if (printContent) {
      const originalWidth = printContent.style.width;
      const originalMaxWidth = printContent.style.maxWidth;
      const originalMinHeight = printContent.style.minHeight;
      const originalDisplay = printContent.style.display;
      const originalFlexDir = printContent.style.flexDirection;
      const originalBorderRadius = printContent.style.borderRadius;

      const tableWrapper = printContent.querySelector(
        ".table-wrapper",
      ) as HTMLElement;
      const origOverflow = tableWrapper ? tableWrapper.style.overflow : "";

      // Force A4 size constraints (794x1123 at 96 DPI)
      printContent.style.width = "794px";
      printContent.style.maxWidth = "794px";
      printContent.style.minHeight = "1123px";
      printContent.style.display = "flex";
      printContent.style.flexDirection = "column";
      printContent.style.borderRadius = "0px";

      if (tableWrapper) tableWrapper.style.overflow = "visible";
      
      const isMobile = window.innerWidth < 1024;
      let styleEl: HTMLStyleElement | null = null;
      if (isMobile) {
        styleEl = document.createElement('style');
        styleEl.innerHTML = `
          .sm\\:px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
          .sm\\:py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
          .sm\\:p-8 { padding: 2rem !important; }
          .sm\\:text-base { font-size: 1rem !important; line-height: 1.5 !important; }
          .sm\\:text-sm { font-size: 0.875rem !important; line-height: 1.25 !important; }
          .sm\\:text-lg { font-size: 1.125rem !important; line-height: 1.75 !important; }
          .sm\\:text-3xl { font-size: 1.875rem !important; line-height: 2.25 !important; }
          .sm\\:min-w-0 { min-width: 0px !important; }
          .sm\\:w-auto { width: auto !important; }
          .sm\\:w-48 { width: 12rem !important; }
          .sm\\:gap-3 { gap: 0.75rem !important; }
          .sm\\:mt-0 { margin-top: 0px !important; }
          .sm\\:overflow-visible { overflow: visible !important; }
          .sm\\:align-middle { vertical-align: middle !important; }
        `;
        document.head.appendChild(styleEl);
      }

      const footer = document.createElement("div");
      footer.className =
        "mt-auto p-6 md:p-8 bg-[#f8fafc] border-t-2 border-indigo-100 flex justify-between items-end text-slate-500 font-medium text-sm relative z-50 shrink-0";
      const currentDomain = window.location.hostname;
      
      let qrCodeImg = "";
      try {
        qrCodeImg = await QRCode.toDataURL(window.location.href, { margin: 1, width: 90, color: { dark: '#1e1b4b' } });
      } catch (e) {
        console.error(e);
      }

      const generatedOn = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      footer.innerHTML = `
        <div class="flex flex-col gap-1 items-start w-1/3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <span class="font-bold text-xl text-blue-800 tracking-tight">
              BTEB Result Library
            </span>
          </div>
          <div class="text-[10px] text-slate-500 font-semibold tracking-wider uppercase ml-10">Generated Document</div>
        </div>
        
        <div class="w-1/3 text-center pb-1"></div>

        <div class="w-1/3 flex justify-end">
          ${qrCodeImg ? `
            <div class="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
              <div class="text-right">
                <div class="text-xs font-bold text-indigo-900 mb-0.5">Verify Online</div>
                <div class="text-[9px] text-slate-500 leading-tight">Scan this QR code<br/>to open live page</div>
              </div>
              <img src="${qrCodeImg}" alt="QR Code" class="w-[60px] h-[60px] rounded object-contain bg-white" />
            </div>
          ` : ''}
        </div>
      `;
      printContent.appendChild(footer);

      try {
        const dataUrl = await toJpeg(printContent, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          style: {
            width: "794px", // Force the exact width for rendering
            fontFamily: "sans-serif", // Fallback to ensure text matches UI
          },
        });

        if (type === 'jpg') {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `${activeDepartment}-${activeSemester}-Booklist.jpg`;
          link.click();
        } else if (type === 'pdf') {
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve) => {
             img.onload = resolve;
          });
          
          const pdfWidth = 210;
          const pdfHeight = (img.height * pdfWidth) / img.width;
          
          const pdf = new jsPDF({
            orientation: pdfHeight > 297 ? "portrait" : "portrait", // mostly portrait
            unit: "mm",
            format: [pdfWidth, Math.max(pdfHeight, 297)]
          });
          
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${activeDepartment}-${activeSemester}-Booklist.pdf`);
        }
      } catch (err) {
        console.error("Error generating screenshot or PDF", err);
      } finally {
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
        printContent.style.width = originalWidth;
        printContent.style.maxWidth = originalMaxWidth;
        printContent.style.minHeight = originalMinHeight;
        printContent.style.display = originalDisplay;
        printContent.style.flexDirection = originalFlexDir;
        printContent.style.borderRadius = originalBorderRadius;
        if (tableWrapper) tableWrapper.style.overflow = origOverflow;
        if (printContent.contains(footer)) {
          printContent.removeChild(footer);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-blue-700">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-gray-600">Loading booklists...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 font-sans relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[80px]" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="mb-12 text-center print:hidden">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Booklists Library
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Find your required subjects and book codes easily. Select your
            curriculum, regulation, semester, and department to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          {/* Sidebar Filters */}
          <div className="lg:col-span-4 space-y-6">
            {/* Curriculum */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 p-6 relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <h2>Curriculum</h2>
                </div>
                <div className="space-y-2 relative">
                  {curriculums.length > 0 ? (
                    <div className="relative">
                      <select
                        value={activeCurriculum || ""}
                        onChange={(e) =>
                          setActiveFilter("curriculum", e.target.value)
                        }
                        className="w-full appearance-none bg-slate-50/50 border border-slate-200 text-slate-700 py-4 px-4 pr-10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white font-medium text-sm transition-all cursor-pointer"
                      >
                        <option value="" disabled>
                          Select Curriculum
                        </option>
                        {curriculums.map((curr) => (
                          <option key={curr} value={curr}>
                            {curr}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No curriculums found.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Regulation */}
            <AnimatePresence>
              {activeCurriculum && regulations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 p-6 relative z-10"
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      <h2>Regulation</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {regulations.map((reg) => (
                        <button
                          key={reg}
                          onClick={() => setActiveFilter("regulation", reg)}
                          className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all text-center ${
                            activeRegulation === reg
                              ? "bg-indigo-500 text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)]"
                              : "bg-slate-50/50 text-slate-600 hover:bg-white hover:border-indigo-200 border border-slate-200"
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Semester */}
            <AnimatePresence>
              {activeRegulation && semesters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 p-6 relative z-10"
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                      <Layers className="w-5 h-5 text-emerald-500" />
                      <h2>Semester</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {semesters.map((sem) => (
                        <button
                          key={sem}
                          onClick={() => setActiveFilter("semester", sem)}
                          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                            activeSemester === sem
                              ? "bg-emerald-500 text-white shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)]"
                              : "bg-slate-50/50 text-slate-600 hover:bg-white hover:border-emerald-200 border border-slate-200"
                          }`}
                        >
                          {sem}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Department */}
            <AnimatePresence>
              {activeSemester && departments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 p-6 relative z-10"
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                      <Building2 className="w-5 h-5 text-orange-500" />
                      <h2>Department</h2>
                    </div>
                    <div className="space-y-2 relative">
                      <div className="relative">
                        <select
                          value={activeDepartment || ""}
                          onChange={(e) =>
                            setActiveFilter("department", e.target.value)
                          }
                          className="w-full appearance-none bg-slate-50/50 border border-slate-200 text-slate-700 py-4 px-4 pr-10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white font-medium text-sm transition-all cursor-pointer"
                        >
                          <option value="" disabled>
                            Select Department
                          </option>

                          {departments.map((dept) => {
                            const match = dept.match(/^(\d+)\s+(.+)$/);
                            const display = match ? `${match[2]} (${match[1]})` : dept;
                            return (
                              <option key={dept} value={dept}>
                                {display}
                              </option>
                            );
                          })}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!activeDepartment ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/90 backdrop-blur-2xl border-2 border-dashed border-slate-200/60 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative z-10"
                >
                  <div className="w-20 h-20 bg-blue-50/50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <BookCopy className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">
                    Configure Your Booklist
                  </h3>
                  <p className="text-slate-500 max-w-sm text-lg">
                    Select curriculum, regulation, semester, and department from
                    the sidebar to view subjects and book codes.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:px-6 rounded-2xl border border-slate-100 shadow-sm print:hidden gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <BookCopy className="w-5 h-5 text-blue-500" />
                      Booklist Explorer
                    </h3>
                    <div className="flex flex-wrap w-full sm:w-auto gap-2">
                      <button
                        onClick={handleShare}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      <button
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95"
                      >
                        <Printer className="w-4 h-4" /> Download PDF
                      </button>
                      <button
                        onClick={handleDownloadPNG}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95"
                      >
                        <Download className="w-4 h-4" /> Download JPG
                      </button>
                    </div>
                  </div>

                  <div
                    id="booklist-card"
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative flex flex-col min-h-0"
                  >
                    {/* Modern Header */}
                    <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-emerald-900 p-6 sm:p-8 text-white relative overflow-hidden shrink-0">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
                      <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
                        <BookOpen className="w-24 h-24" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
                              Book List
                            </h1>
                            <p className="text-blue-100/80 font-medium text-sm tracking-wide">
                              BTEB Result Library
                            </p>
                          </div>
                          <div className="hidden sm:block text-right">
                            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-white/90 text-sm font-medium backdrop-blur-md">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              btebresultlibrary.vercel.app
                            </span>
                          </div>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent my-1"></div>

                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start sm:items-end">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
                              {activeDepartment}
                            </h2>
                            <p className="text-emerald-100 font-medium text-base sm:text-lg flex items-center gap-2">
                              {activeSemester} Semester
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                              {activeCurriculum}
                            </span>
                            <span className="bg-white/10 border border-white/20 text-blue-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                              {activeRegulation} Probidhan
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-white flex-1 overflow-hidden flex flex-col">
                      {filteredSubjects.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 flex-1">
                          <p className="text-slate-500">
                            No subjects found for this selection.
                          </p>
                        </div>
                      ) : (
                        <div className="table-wrapper overflow-x-auto sm:overflow-visible rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[300px]">
                            <thead className="bg-[#f8fafc] border-b-2 border-indigo-100">
                              <tr>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900">
                                  Subject Name
                                </th>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900 w-32 sm:w-48 whitespace-nowrap">
                                  Subject Code
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {filteredSubjects.map((subject, idx) => (
                                <tr
                                  key={subject.id}
                                  className={`transition-colors hover:bg-emerald-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                >
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-middle">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-indigo-50/50 p-2 rounded-lg text-indigo-500 flex-shrink-0 border border-indigo-100/50 shadow-sm">
                                        <BookCopy className="w-5 h-5" />
                                      </div>
                                      <span className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                                        {subject.subjectName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-middle">
                                    <span className="inline-block font-mono text-xs sm:text-sm font-bold tracking-widest bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 whitespace-nowrap shadow-sm">
                                      {subject.subjectCode}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Print View Layout */}
        <div
          id="print-booklist-container"
          className="absolute -left-[9999px] top-0 w-[800px] bg-white p-10 print:static print:w-auto print:block"
        >
          <div className="text-center mb-10 pb-6 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booklist</h1>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {activeCurriculum}
            </h2>
            <div className="text-lg text-gray-600 font-semibold space-y-1">
              <p>{activeRegulation} Regulation</p>
              <p>
                {activeDepartment} - {activeSemester} Semester
              </p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-gray-400">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm w-3/4">
                  Subject Name
                </th>
                <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm">
                  Subject Code
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject, index) => (
                <tr key={subject.id || index}>
                  <td className="px-6 py-4 border border-gray-400 text-gray-900 font-medium">
                    {subject.subjectName}
                  </td>
                  <td className="px-6 py-4 border border-gray-400 text-gray-900 font-mono font-bold">
                    {subject.subjectCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 pt-6 border-t font-sans border-gray-300 flex justify-between items-center text-gray-600 relative h-[100px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center mt-3">
              <p className="font-bold text-gray-900 text-lg">BTEB Result Library</p>
              <p className="text-sm mt-1">{window.location.host}</p>
            </div>
            <div className="flex-1"></div>
            {typeof window !== 'undefined' && (
              <div className="flex flex-col items-center ml-auto">
                <QRCodeSVG value={window.location.href} size={96} />
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Scan for actual result</span>
              </div>
            )}
          </div>
        </div>
      </div>
        <SeoBlocks 
          pageTitle="BTEB Booklist | Diploma 2022 Regulation Syllabus BD"
          metaDescription="Get the official BTEB diploma 2022 regulation book list. Check semester-wise engineering syllabus BD and subject codes instantly."
          aboutTitle="About BTEB Diploma Syllabus & Booklist"
          aboutContent={
            <>
              <p>
                Successfully navigating the transition between academic semesters requires a clear understanding of your mandatory subjects and their unique board codes. To streamline this process, our comprehensive database features the fully verified <strong>diploma 2022 regulation book list</strong> alongside historical 2016 probidhan data, ensuring every polytechnic student can access their precise academic requirements without confusion.
              </p>
              <p>
                Functioning as a highly responsive digital substitute for the traditional <strong>bteb syllabus pdf</strong>, this dynamic platform allows you to instantly generate a structured <strong>diploma booklist</strong>. Whether you focus on Computer Architecture, Civil Engineering, or any specialized trade within Bangladesh, you can effortlessly filter, view, and organize your exact semester curriculum on demand.
              </p>
            </>
          }
          howItWorksSteps={[
            { title: "Select Domain", desc: "Choose your academic path (e.g., Engineering, Textile)." },
            { title: "Set Probidhan", desc: "Select 2022 Regulation for the newest curriculum standard." },
            { title: "Pick Semester & Dept", desc: "Filter deeper to your active current status." },
            { title: "Share or Save", desc: "Click 'Share' to send a direct link to your classmates." }
          ]}
          faqs={[
            { q: "Is this booklist updated for the 2022 Regulation?", a: "Yes. Our database contains the fully updated subject codes and subject names specifically formulated by the BTEB for the 2022 Probidhan." },
            { q: "Can I share a precise booklist with my classmates?", a: "Absolutely. When you select a specific filter combination (e.g. Computer - 4th Semester - 2022), the URL updates automatically. You can copy that URL or click the 'Share' button to send it directly to your friends." },
            { q: "What should I do if a book code seems incorrect?", a: "While we strive for 100% accuracy, BTEB sometimes makes syllabus amendments. Always match the primary codes with your polytechnic institute's official notice board just to be sure." }
          ]}
          keywordBoostText="Locate your precise diploma 2022 regulation book list effortlessly. Access highly structured bteb syllabus pdf alternatives, explore your customized diploma booklist, and strategically map out your engineering syllabus bd requirements exclusively at BTEB Result Library."
        />
    </div>
  );
}
