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
import { toPng } from "html-to-image";
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
        (b.department || "Unknown") === activeDepartment,
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

  const handlePrint = () => {
    window.print();
  };

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

  const handleDownloadPNG = async () => {
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

      const footer = document.createElement("div");
      footer.className =
        "mt-auto p-8 border-t border-slate-100 flex justify-between items-center bg-white text-slate-500 font-medium text-sm";
      const currentDomain = window.location.hostname;
      footer.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-blue-600 font-bold text-lg">BTEB Result Library</span>
        </div>
        <div class="text-base text-slate-400">${currentDomain}</div>
      `;
      printContent.appendChild(footer);

      try {
        const dataUrl = await toPng(printContent, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          style: {
            width: "794px", // Force the exact width for rendering
            fontFamily: "sans-serif", // Fallback to ensure text matches UI
          },
        });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${activeDepartment}-${activeSemester}-Booklist.png`;
        link.click();
      } catch (err) {
        console.error("Error generating screenshot", err);
      } finally {
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
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
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
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button
                        onClick={handleDownloadPNG}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-600/20"
                      >
                        <Download className="w-4 h-4" /> Download PNG
                      </button>
                    </div>
                  </div>

                  <div
                    id="booklist-card"
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative"
                  >
                    <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <BookOpen className="w-32 h-32" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                            {activeCurriculum}
                          </span>
                          <span className="bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                            {activeRegulation} Probidhan
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                          {activeDepartment}
                        </h2>
                        <p className="text-slate-300 text-base sm:text-lg flex items-center gap-2">
                          {activeSemester} Semester
                        </p>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-white">
                      <h3 className="text-xl font-bold text-gray-800 mb-6">
                        Subjects
                      </h3>

                      {filteredSubjects.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-slate-500">
                            No subjects found for this selection.
                          </p>
                        </div>
                      ) : (
                        <div className="table-wrapper overflow-x-auto sm:overflow-visible rounded-2xl border border-gray-200 shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[300px]">
                            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600">
                              <tr>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm">
                                  Subject Name
                                </th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm w-32 sm:w-48">
                                  Subject Code
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {filteredSubjects.map((subject) => (
                                <tr
                                  key={subject.id}
                                  className="hover:bg-blue-50/50 transition-colors"
                                >
                                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                                      <div className="bg-blue-50 p-1.5 sm:p-2 rounded-lg text-blue-600 mt-0.5 sm:mt-0 flex-shrink-0">
                                        <BookCopy className="w-4 h-4 sm:w-5 sm:h-5" />
                                      </div>
                                      <span className="font-semibold text-gray-800 text-sm sm:text-base leading-tight mt-0.5 sm:mt-0">
                                        {subject.subjectName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-top sm:align-middle">
                                    <span className="inline-block font-mono text-xs sm:text-sm font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">
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

          <div className="mt-12 pt-6 border-t border-gray-300 text-center text-gray-500 text-sm font-medium">
            <p>Downloaded from BTEB Result Library</p>
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
                When transitioning between semesters, knowing the exact subjects and their respective board codes is vital. 
                Our library hosts the updated <strong>diploma 2022 regulation book list</strong> and the previous 2016 probidhan data to help 
                polytechnic students find their academic materials easily.
              </p>
              <p>
                This interactive tool serves as a digital alternative to the official <strong>bteb syllabus pdf</strong>. 
                Whether you need the <strong>diploma booklist</strong> for Computer technology, Civil engineering, 
                or any other department out of the hundreds offered in Bangladesh, simply filter and generate your customized booklist instantly.
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
          keywordBoostText="Discover your exact diploma 2022 regulation book list right here. Find the bteb syllabus pdf alternatives, search your diploma booklist, and plan your engineering syllabus bd semester perfectly with BTEB Result Library."
        />
    </div>
  );
}
