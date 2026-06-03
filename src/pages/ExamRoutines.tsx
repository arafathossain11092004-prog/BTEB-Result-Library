import { useState, useEffect, useMemo } from "react";
import { collection, query, limit, getDocs, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  FileText,
  Printer,
  ChevronRight,
  BookOpen,
  Layers,
  GraduationCap,
  Building2,
  Download,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import SeoBlocks from "../components/SeoBlocks";

export default function ExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCurriculum, setActiveCurriculum] = useState<string | null>(null);
  const [activeRegulation, setActiveRegulation] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);

  const displayPublishDate = useMemo(() => {
    const published = routines.filter((r) => r.publishDate);
    if (published.length === 0) return null;
    return published.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())[0].publishDate;
  }, [routines]);

  useEffect(() => {
    fetchRoutines().catch(console.error);
  }, []);

  const fetchRoutines = async () => {
    try {
      const q = query(collection(db, "examRoutines"), orderBy("date", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRoutines(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const curriculums = useMemo(
    () =>
      Array.from(
        new Set(routines.map((r) => r.curriculum || "Unknown")),
      ).sort(),
    [routines],
  );

  const regulations = useMemo(() => {
    if (!activeCurriculum) return [];
    return Array.from(
      new Set(
        routines
          .filter((r) => (r.curriculum || "Unknown") === activeCurriculum)
          .map((r) => r.regulation || "Unknown"),
      ),
    )
      .sort()
      .reverse();
  }, [routines, activeCurriculum]);

  const departments = useMemo(() => {
    if (!activeCurriculum || !activeRegulation) return [];
    return Array.from(
      new Set(
        routines
          .filter(
            (r) =>
              (r.curriculum || "Unknown") === activeCurriculum &&
              (r.regulation || "Unknown") === activeRegulation,
          )
          .map((r) => r.department || "Unknown"),
      ),
    ).sort();
  }, [routines, activeCurriculum, activeRegulation]);

  const semesters = useMemo(() => {
    if (!activeCurriculum || !activeRegulation || !activeDepartment) return [];
    return Array.from(
      new Set(
        routines
          .filter(
            (r) =>
              (r.curriculum || "Unknown") === activeCurriculum &&
              (r.regulation || "Unknown") === activeRegulation &&
              (r.department || "Unknown") === activeDepartment,
          )
          .map((r) => r.semester || "Unknown"),
      ),
    ).sort();
  }, [routines, activeCurriculum, activeRegulation, activeDepartment]);

  const filteredSubjects = useMemo(() => {
    if (
      !activeCurriculum ||
      !activeRegulation ||
      !activeSemester ||
      !activeDepartment
    )
      return [];
    return routines.filter(
      (r) =>
        (r.curriculum || "Unknown") === activeCurriculum &&
        (r.regulation || "Unknown") === activeRegulation &&
        (r.semester || "Unknown") === activeSemester &&
        ((r.department || "Unknown") === activeDepartment || (r.department === "All Department"))
    );
  }, [
    routines,
    activeCurriculum,
    activeRegulation,
    activeSemester,
    activeDepartment,
  ]);

  // Auto-select if only one option available
  useEffect(() => {
    if (curriculums.length === 1 && !activeCurriculum)
      setActiveCurriculum(curriculums[0]);
  }, [curriculums, activeCurriculum]);

  useEffect(() => {
    if (regulations.length === 1 && !activeRegulation)
      setActiveRegulation(regulations[0]);
    else if (activeCurriculum && !regulations.includes(activeRegulation || ""))
      setActiveRegulation(null);
  }, [regulations, activeRegulation, activeCurriculum]);

  useEffect(() => {
    if (departments.length === 1 && !activeDepartment)
      setActiveDepartment(departments[0]);
    else if (activeRegulation && !departments.includes(activeDepartment || ""))
      setActiveDepartment(null);
  }, [departments, activeDepartment, activeRegulation]);

  useEffect(() => {
    if (semesters.length === 1 && !activeSemester)
      setActiveSemester(semesters[0]);
    else if (activeDepartment && !semesters.includes(activeSemester || ""))
      setActiveSemester(null);
  }, [semesters, activeSemester, activeDepartment]);

  const handleDownloadPNG = () => generateImageAndDownload('jpg');
  const handlePrint = () => generateImageAndDownload('pdf');

  const generateImageAndDownload = async (type: 'pdf' | 'jpg') => {
    const printContent = document.getElementById("routine-card");
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

      // Force A4 size constraints (1123x794 at 96 DPI)
      printContent.style.width = "1123px";
      printContent.style.maxWidth = "1123px";
      // We don't force minHeight to 794px if the content is longer, 
      // but let's keep it to keep layout consistent.
      printContent.style.minHeight = "794px";
      printContent.style.display = "flex";
      printContent.style.flexDirection = "column";
      printContent.style.borderRadius = "0px";

      if (tableWrapper) tableWrapper.style.overflow = "visible";
      
      const isMobile = window.innerWidth < 1024;
      let styleEl: HTMLStyleElement | null = null;
      styleEl = document.createElement('style');
      styleEl.innerHTML = `
      .lg\\:col-span-4 { grid-column: span 4 / span 4 !important; }
      .lg\\:col-span-8 { grid-column: span 8 / span 8 !important; }
      .lg\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
      .md\\:p-8 { padding: 2rem !important; }
      .md\\:text-5xl { font-size: 3rem !important; line-height: 1 !important; }
      .sm\\:block { display: block !important; }
      .sm\\:flex-none { flex: none !important; }
      .sm\\:flex-row { flex-direction: row !important; }
      .sm\\:gap-6 { gap: 1.5rem !important; }
      .sm\\:items-center { align-items: center !important; }
      .sm\\:items-end { align-items: flex-end !important; }
      .sm\\:min-w-0 { min-width: 0px !important; }
      .sm\\:overflow-visible { overflow: visible !important; }
      .sm\\:p-8 { padding: 2rem !important; }
      .sm\\:px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
      .sm\\:py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
      .sm\\:text-2xl { font-size: 1.5rem !important; line-height: 2 !important; }
      .sm\\:text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }
      .sm\\:text-base { font-size: 1rem !important; line-height: 1.5 !important; }
      .sm\\:text-lg { font-size: 1.125rem !important; line-height: 1.75 !important; }
      .sm\\:text-sm { font-size: 0.875rem !important; line-height: 1.25 !important; }
      .sm\\:w-auto { width: auto !important; }
    `;
      document.head.appendChild(styleEl);

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
            width: "1123px", // Force the exact width for rendering
            fontFamily: "sans-serif",
          },
        });

        if (type === 'jpg') {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `${activeDepartment}-${activeSemester}-Routine.jpg`;
          link.click();
        } else if (type === 'pdf') {
          // Create PDF
          // We know the canvas was rendered at 1123px width. We need to measure its actual height.
          // Since we set pixelRatio: 2, the image itself might be 2246px wide.
          
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve) => {
             img.onload = resolve;
          });
          
          // Calculate height in mm keeping aspect ratio
          // A4 Landscape width is 297mm
          const pdfWidth = 297;
          const pdfHeight = (img.height * pdfWidth) / img.width;
          
          const pdf = new jsPDF({
            orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
            unit: "mm",
            format: [pdfWidth, Math.max(pdfHeight, 210)] // A4 height is 210
          });
          
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${activeDepartment}-${activeSemester}-Routine.pdf`);
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
        <p className="mt-4 font-medium text-gray-600">
          Loading exam routines...
        </p>
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
            Exam Routines
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Find your exam schedules easily. Select your curriculum, regulation,
            department, and semester to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          {/* Sidebar Filters */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Publish Date Badge */}
            {displayPublishDate && (
              <div className="bg-emerald-50 border border-emerald-200/60 rounded-3xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Publish Date</h3>
                    <p className="text-emerald-700 font-medium text-sm">
                      {new Date(displayPublishDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                        onChange={(e) => setActiveCurriculum(e.target.value)}
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
                          onClick={() => setActiveRegulation(reg)}
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

            {/* Department */}
            <AnimatePresence>
              {activeRegulation && departments.length > 0 && (
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
                          onChange={(e) => setActiveDepartment(e.target.value)}
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

            {/* Semester */}
            <AnimatePresence>
              {activeDepartment && semesters.length > 0 && (
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
                          onClick={() => setActiveSemester(sem)}
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
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!activeSemester ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/90 backdrop-blur-2xl border-2 border-dashed border-slate-200/60 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative z-10"
                >
                  <div className="w-20 h-20 bg-blue-50/50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">
                    Configure Your Exam Routine
                  </h3>
                  <p className="text-slate-500 max-w-sm text-lg">
                    Select curriculum, regulation, department, and semester from
                    the sidebar to view your schedule.
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
                      <FileText className="w-5 h-5 text-blue-500" />
                      Routine Explorer
                    </h3>
                    <div className="flex flex-wrap w-full sm:w-auto gap-2">
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
                    id="routine-card"
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative flex flex-col min-h-0"
                  >
                    {/* Modern Header */}
                    <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 p-6 sm:p-8 text-white relative overflow-hidden shrink-0">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
                      <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
                        <FileText className="w-24 h-24" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
                              Exam Routine
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
                            <p className="text-blue-200 font-medium text-base sm:text-lg flex items-center gap-2">
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
                            No routines found for this selection.
                          </p>
                        </div>
                      ) : (
                        <div className="table-wrapper overflow-x-auto sm:overflow-visible rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0 bg-white">
                            <thead className="bg-[#f8fafc] border-b-2 border-indigo-100">
                              <tr>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900 whitespace-nowrap">
                                  Date & Day
                                </th>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900">
                                  Time
                                </th>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900">
                                  Subject Name
                                </th>
                                <th className="px-4 py-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-indigo-900 whitespace-nowrap">
                                  Code
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                              {filteredSubjects.map((subject, idx) => (
                                <tr
                                  key={subject.id}
                                  className={`transition-colors hover:bg-indigo-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                >
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-top">
                                    <div className="font-bold text-slate-900 text-sm sm:text-base">
                                      {subject.date}
                                    </div>
                                    {subject.day && (
                                      <div className="text-xs font-semibold text-indigo-600/80 mt-0.5">
                                        {subject.day}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-middle">
                                    <span className="inline-flex items-center bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide whitespace-nowrap shadow-sm">
                                      {subject.time}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-slate-800 text-sm sm:text-base leading-snug align-middle">
                                    {subject.subjectName}
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-middle">
                                    <span className="inline-block font-mono text-xs sm:text-sm font-bold tracking-widest bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 whitespace-nowrap shadow-sm">
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
          id="print-routine-container"
          className="absolute -left-[9999px] top-0 w-[800px] bg-white p-10 print:static print:w-auto print:block"
        >
          <div className="text-center mb-10 pb-6 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Exam Routine
            </h1>
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
                <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm">
                  Date & Day
                </th>
                <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm">
                  Time
                </th>
                <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm w-1/2">
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
                  <td className="px-6 py-4 border border-gray-400 text-gray-900">
                    <span className="font-medium block">{subject.date}</span>
                    {subject.day && (
                      <span className="text-gray-500 text-sm">
                        {subject.day}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 border border-gray-400 text-gray-900 font-medium">
                    {subject.time}
                  </td>
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
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex items-center justify-center gap-2 mt-3">
              <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-lg leading-tight tracking-tight">BTEB Result Library</p>
                <p className="text-sm font-medium">{window.location.host}</p>
              </div>
            </div>
            <div className="flex-1"></div>
            {typeof window !== 'undefined' && (
              <div className="flex flex-col items-center ml-auto">
                <QRCodeSVG value={window.location.href} size={70} />
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Scan to Verify</span>
              </div>
            )}
          </div>
        </div>
      </div>
        <SeoBlocks 
          pageTitle="BTEB Exam Routine 2026 | Download Diploma Routine PDF"
          metaDescription="Get the latest BTEB exam routine 2026 for all polytechnic semesters. Download your diploma routine PDF and stay updated with board exam schedules."
          aboutTitle="About BTEB Exam Routine Hub"
          aboutContent={
            <>
              <p>
                Maintaining awareness of official assessment schedules is fundamentally important for academic success. Our platform features an incredibly streamlined interface to navigate the finalized <strong>bteb exam routine 2026</strong>. Rather than forcing students to interpret massive, multi-page official documents, we convert the entire <strong>board exam routine</strong> into a dynamic, filterable table tailored specifically to your needs.
              </p>
              <p>
                Simply specify your core engineering technology or trade, along with your current semester, to auto-generate a highly organized and visually pristine <strong>diploma routine pdf</strong>. You can instantly execute a print command or securely save it as an image to use for rapid reference throughout your final assessment period.
              </p>
            </>
          }
          howItWorksSteps={[
            { title: "Select Curriculum", desc: "Choose your primary program, e.g., Diploma in Engineering." },
            { title: "Pick Regulation", desc: "Ensure you select your correct probidhan (2016 or 2022)." },
            { title: "Filter by Dept/Sem", desc: "Click on your specific department and semester." },
            { title: "Download PDF/Image", desc: "Export your filtered routine as an image or print as a PDF instantly." }
          ]}
          faqs={[
            { q: "Where can I find the latest BTEB exam routine?", a: "You can find it right here. We regularly update our database whenever a new board circular is published regarding exam schedules." },
            { q: "How do I download the diploma routine in PDF format?", a: "After filtering your curriculum, select your department and semester, and click the 'Print' button. You can then select 'Save as PDF' on your browser's print dialog." },
            { q: "What should I do if my exam routine changes?", a: "Stay connected with this page. If the BTEB announces a date change or a postponed exam, we update the routine database immediately." }
          ]}
          keywordBoostText="Prepare for critical assessments utilizing our updated bteb exam routine 2026 directory. Seamlessly curate and download your customized diploma routine pdf. Every crucial detail concerning your board exam routine is definitively cataloged here for optimal accessibility."
        />
    </div>
  );
}
