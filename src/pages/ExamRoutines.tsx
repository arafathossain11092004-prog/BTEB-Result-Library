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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
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

  const semesters = useMemo(() => {
    if (!activeCurriculum || !activeRegulation) return [];
    return Array.from(
      new Set(
        routines
          .filter(
            (r) =>
              (r.curriculum || "Unknown") === activeCurriculum &&
              (r.regulation || "Unknown") === activeRegulation,
          )
          .map((r) => r.semester || "Unknown"),
      ),
    ).sort();
  }, [routines, activeCurriculum, activeRegulation]);

  const departments = useMemo(() => {
    if (!activeCurriculum || !activeRegulation || !activeSemester) return [];
    return Array.from(
      new Set(
        routines
          .filter(
            (r) =>
              (r.curriculum || "Unknown") === activeCurriculum &&
              (r.regulation || "Unknown") === activeRegulation &&
              (r.semester || "Unknown") === activeSemester,
          )
          .map((r) => r.department || "Unknown"),
      ),
    ).sort();
  }, [routines, activeCurriculum, activeRegulation, activeSemester]);

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
        (r.department || "Unknown") === activeDepartment,
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
    if (semesters.length === 1 && !activeSemester)
      setActiveSemester(semesters[0]);
    else if (activeRegulation && !semesters.includes(activeSemester || ""))
      setActiveSemester(null);
  }, [semesters, activeSemester, activeRegulation]);

  useEffect(() => {
    if (departments.length === 1 && !activeDepartment)
      setActiveDepartment(departments[0]);
    else if (activeSemester && !departments.includes(activeDepartment || ""))
      setActiveDepartment(null);
  }, [departments, activeDepartment, activeSemester]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
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
        "mt-auto p-8 border-t border-slate-100 flex flex-col justify-center items-center text-center bg-white text-slate-500 font-medium text-sm";
      const currentDomain = window.location.hostname;
      
      let qrCodeImg = "";
      try {
        qrCodeImg = await QRCode.toDataURL(window.location.href, { margin: 0, width: 96 });
      } catch (e) {
        console.error(e);
      }

      footer.innerHTML = `
        <div class="flex flex-col items-center gap-2 mb-4">
           <div>
             <div class="text-blue-600 font-bold text-xl mb-1">BTEB Result Library</div>
             <div class="text-base text-slate-400">${currentDomain}</div>
           </div>
        </div>
        ${qrCodeImg ? `<div class="flex flex-col items-center"><img src="${qrCodeImg}" alt="QR Code" width="80" height="80" /><span class="text-[10px] mt-1 text-slate-500 font-medium">Scan for actual routine</span></div>` : ''}
      `;
      printContent.appendChild(footer);

      try {
        const dataUrl = await toPng(printContent, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          style: {
            width: "794px", // Force the exact width for rendering
            fontFamily: "sans-serif",
          },
        });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${activeDepartment}-${activeSemester}-Routine.png`;
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
            semester, and department to get started.
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
                          onChange={(e) => setActiveDepartment(e.target.value)}
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
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">
                    Configure Your Exam Routine
                  </h3>
                  <p className="text-slate-500 max-w-sm text-lg">
                    Select curriculum, regulation, semester, and department from
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
                    id="routine-card"
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative"
                  >
                    <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <FileText className="w-32 h-32" />
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
                        Exam Schedule
                      </h3>

                      {filteredSubjects.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-slate-500">
                            No routines found for this selection.
                          </p>
                        </div>
                      ) : (
                        <div className="table-wrapper overflow-x-auto sm:overflow-visible rounded-2xl border border-gray-200 shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600">
                              <tr>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm whitespace-nowrap">
                                  Date & Day
                                </th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm">
                                  Time
                                </th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm">
                                  Subject Name
                                </th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-sm w-24 sm:w-auto">
                                  Code
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
                                    <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                      {subject.date}
                                    </div>
                                    {subject.day && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {subject.day}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                                    <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs sm:text-sm font-medium whitespace-nowrap">
                                      {subject.time}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-gray-800 text-sm sm:text-base leading-tight">
                                    {subject.subjectName}
                                  </td>
                                  <td className="px-4 py-3 sm:px-6 sm:py-4 align-top sm:align-middle">
                                    <span className="inline-block font-mono text-xs sm:text-sm font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200">
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

          <div className="mt-8 pt-6 border-t font-sans border-gray-300 flex justify-between items-center text-gray-600">
            <div>
              <p className="font-bold text-gray-900 text-lg">BTEB Result Library</p>
              <p className="text-sm mt-1">{window.location.origin}</p>
            </div>
            {typeof window !== 'undefined' && (
              <div className="flex flex-col items-center">
                <QRCodeSVG value={window.location.href} size={96} />
                <span className="text-[10px] mt-1 text-gray-500 font-medium">Scan for actual result</span>
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
                Staying updated with the latest exam schedule is crucial for exam preparation. 
                Our platform provides the most accessible interface to find the <strong>bteb exam routine 2026</strong>. 
                Unlike scrolling through confusing official PDFs that contain hundreds of pages, we have digitized the 
                <strong>board exam routine</strong> so you only see what matters to you.
              </p>
              <p>
                Select your specific technology (e.g., Computer, Civil) and semester, and we instantly generate a clean, 
                readable <strong>diploma routine pdf</strong> format. You can print it directly or download a PNG image 
                to use as your mobile wallpaper during exam season.
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
          keywordBoostText="Stay ready for finals with our bteb exam routine 2026 directory. Download your custom diploma routine pdf easily. Everything related to board exam routines is organized here for you."
        />
    </div>
  );
}
