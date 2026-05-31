import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  BookOpen,
  GraduationCap,
  Building2,
  FileText,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SeoBlocks from "../components/SeoBlocks";
import { toPng } from "html-to-image";
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

export default function ExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCurriculum, setActiveCurriculum] = useState<string>("");
  const [activeTechnology, setActiveTechnology] = useState<string>("");
  const [activeProbidhan, setActiveProbidhan] = useState<string>("");
  const [activeSemester, setActiveSemester] = useState<string>("");

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

  // Extract unique options from the fetch data based on current selections
  const curriculums = useMemo(() => Array.from(new Set(routines.map(r => r.curriculum || ""))).filter(Boolean), [routines]);
  
  const probidhans = useMemo(() => {
    let filtered = routines;
    if (activeCurriculum) filtered = filtered.filter(r => r.curriculum === activeCurriculum);
    return Array.from(new Set(filtered.map(r => r.regulation || ""))).filter(Boolean).sort().reverse();
  }, [routines, activeCurriculum]);

  const semesters = useMemo(() => {
    let filtered = routines;
    if (activeCurriculum) filtered = filtered.filter(r => r.curriculum === activeCurriculum);
    if (activeProbidhan) filtered = filtered.filter(r => r.regulation === activeProbidhan);
    return Array.from(new Set(filtered.map(r => r.semester || ""))).filter(Boolean).sort();
  }, [routines, activeCurriculum, activeProbidhan]);

  const technologies = useMemo(() => {
    let filtered = routines;
    if (activeCurriculum) filtered = filtered.filter(r => r.curriculum === activeCurriculum);
    if (activeProbidhan) filtered = filtered.filter(r => r.regulation === activeProbidhan);
    if (activeSemester) filtered = filtered.filter(r => r.semester === activeSemester);
    return Array.from(new Set(filtered.map(r => r.department || ""))).filter(Boolean).sort();
  }, [routines, activeCurriculum, activeProbidhan, activeSemester]);

  // Apply filters
  const filteredRoutines = useMemo(() => {
    let result = routines;
    
    if (activeCurriculum) result = result.filter(r => r.curriculum === activeCurriculum);
    if (activeProbidhan) result = result.filter(r => r.regulation === activeProbidhan);
    if (activeSemester) result = result.filter(r => r.semester === activeSemester);
    if (activeTechnology) result = result.filter(r => r.department === activeTechnology);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.subjectName?.toLowerCase().includes(q) || 
        r.subjectCode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [routines, activeCurriculum, activeProbidhan, activeSemester, activeTechnology, searchQuery]);

  const handleDownloadPNG = async (elementId: string, filename: string) => {
    const printContent = document.getElementById(elementId);
    if (printContent) {
      // Temporarily adjust styles for better screenshot
      const originalBg = printContent.style.background;
      printContent.style.background = "#ffffff";
      
      const footer = document.createElement("div");
      footer.style.marginTop = "20px";
      footer.style.paddingTop = "10px";
      footer.style.borderTop = "1px solid #e2e8f0";
      const currentDomain = window.location.hostname;
      
      let qrCodeImg = "";
      try {
        qrCodeImg = await QRCode.toDataURL(window.location.href, { margin: 0, width: 64 });
      } catch (e) {
        console.error(e);
      }

      footer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="width: 64px;"></div>
          <div style="text-align: center; flex: 1;">
            <div style="color: #2563eb; font-weight: bold; font-size: 1rem; margin-bottom: 2px;">BTEB Result Library</div>
            <div style="color: #94a3b8; font-size: 0.875rem;">${currentDomain}</div>
          </div>
          ${qrCodeImg ? `<div style="display: flex; flex-direction: column; align-items: center; width: 64px;"><img src="${qrCodeImg}" alt="QR Code" width="64" height="64" style="margin-bottom: 2px;"/><span style="font-size: 9px; color: #64748b; white-space: nowrap;">Scan for routine</span></div>` : '<div style="width: 64px;"></div>'}
        </div>
      `;
      printContent.appendChild(footer);

      try {
        const dataUrl = await toPng(printContent, { quality: 1.0, pixelRatio: 2, backgroundColor: "#ffffff" });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        link.click();
      } catch (err) {
        console.error("Error generating screenshot", err);
      } finally {
        printContent.style.background = originalBg;
        if (printContent.contains(footer)) {
          printContent.removeChild(footer);
        }
      }
    }
  };

  const handleViewPdf = () => {
    // In our context we just open print dialog
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Exam Routine Portal
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Search, filter, and download your latest academic examination schedules organized by technology and semester.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by subject name or code..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Filter className="w-5 h-5" /> Filters
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={activeCurriculum}
              onChange={(e) => setActiveCurriculum(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
            >
              <option value="">All Curriculums</option>
              {curriculums.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={activeTechnology}
              onChange={(e) => setActiveTechnology(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
            >
              <option value="">All Technologies</option>
              {technologies.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={activeProbidhan}
              onChange={(e) => setActiveProbidhan(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
            >
              <option value="">All Probidhans (Regulations)</option>
              {probidhans.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={activeSemester}
              onChange={(e) => setActiveSemester(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-bold text-slate-800">
              Exam Schedule Results
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              {filteredRoutines.length} items found
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex-1 space-y-3 w-full">
                     <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                     <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                     <div className="h-10 bg-slate-200 rounded w-24"></div>
                     <div className="h-10 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRoutines.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Routines Found</h3>
              <p className="text-slate-500 max-w-sm">
                We couldn't find any exam routines matching your selected filters. Try adjusting your search criteria.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setActiveCurriculum("");
                  setActiveTechnology("");
                  setActiveProbidhan("");
                  setActiveSemester("");
                }}
                className="mt-6 text-blue-600 font-medium hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {filteredRoutines.map((routine) => (
                  <motion.div
                    key={routine.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    id={`routine-${routine.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <Building2 className="w-3 h-3" /> {routine.department || 'General'}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <BookOpen className="w-3 h-3" /> {routine.regulation} Probidhan
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <GraduationCap className="w-3 h-3" /> {routine.semester} Semester
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 truncate">
                        {routine.subjectName}
                        <span className="text-slate-400 font-mono text-sm ml-2 font-normal">({routine.subjectCode})</span>
                      </h3>
                      <div className="flex items-center text-slate-500 text-sm gap-4 mt-3">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {routine.date} {routine.day ? `(${routine.day})` : ''}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {routine.time}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col lg:flex-row gap-3 pt-4 border-t border-slate-100 md:border-t-0 md:pt-0">
                      <button 
                        onClick={handleViewPdf}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Print / View PDF</span>
                        <span className="sm:hidden">Print</span>
                      </button>
                      <button 
                        onClick={() => handleDownloadPNG(`routine-${routine.id}`, `${routine.subjectCode}-Routine.png`)}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-600/20"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Print rendering container for printing all filtered routines */}
      <div className="hidden print:block font-sans">
         <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold">Exam Routine</h1>
            <p className="text-slate-600">
              {activeTechnology ? `${activeTechnology} - ` : ''} 
              {activeSemester ? `${activeSemester} Semester - ` : ''} 
              {activeProbidhan ? `${activeProbidhan} Probidhan` : ''}
            </p>
         </div>
          <table className="w-full text-left border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2">Date & Time</th>
                <th className="border border-slate-300 px-4 py-2">Subject Name (Code)</th>
                <th className="border border-slate-300 px-4 py-2">Semester / Tech</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutines.map(r => (
                <tr key={r.id}>
                  <td className="border border-slate-300 px-4 py-2">
                    <span className="font-semibold block">{r.date}</span>
                    <span className="text-xs text-slate-500">{r.day} • {r.time}</span>
                  </td>
                  <td className="border border-slate-300 px-4 py-2">
                    <span className="font-semibold">{r.subjectName}</span>
                    <br/>
                    <span className="font-mono text-xs">{r.subjectCode}</span>
                  </td>
                  <td className="border border-slate-300 px-4 py-2">
                    {r.department} • {r.semester}
                  </td>
                </tr>
              ))}
            </tbody>
         </table>

         <div className="mt-8 pt-6 border-t font-sans border-slate-300 flex justify-between items-center text-slate-600">
            <div className="w-[80px]"></div> {/* Spacer for centering */}
            <div className="text-center flex-1">
              <p className="font-bold text-slate-900 text-xl">BTEB Result Library</p>
              <p className="text-sm mt-1 font-medium">{typeof window !== 'undefined' ? window.location.host : ''}</p>
            </div>
            {typeof window !== 'undefined' && (
              <div className="flex flex-col items-center w-[80px]">
                <QRCodeSVG value={window.location.href} size={80} />
                <span className="text-[10px] mt-1 text-slate-500 font-medium whitespace-nowrap">Scan for routine</span>
              </div>
            )}
         </div>
      </div>

       <div className="print:hidden">
          <SeoBlocks 
            pageTitle="BTEB Exam Routine 2026 | Full Polytechnic Schedule"
            metaDescription="Search and download your BTEB diploma exam routines instantly. Organized by technology and semester for easy scanning."
            aboutTitle="About Exam Routine Portal"
            aboutContent={
              <>
                <p>
                  This portal simplifies finding your <strong>BTEB polytechnic exam schedule</strong>. 
                  Say goodbye to manually scrolling through hundreds of pages of PDFs. Search by subject, filter by your specific technology or probidhan, and download exactly what you need.
                </p>
              </>
            }
            howItWorksSteps={[
              { title: "Select Filters", desc: "Choose your Technology, Probidhan, and Semester." },
              { title: "Search Instantly", desc: "Use the search bar to find exact subjects or codes." },
              { title: "Download Format", desc: "Print as PDF or download a PNG image of your routine." }
            ]}
            faqs={[
              { q: "How accurate is this routine?", a: "We parse the official board PDFs to ensure 100% accuracy of subject codes, dates, and times." },
              { q: "Can I download routines for offline use?", a: "Yes, use the Download button on any routine card to save it as an image to your device." }
            ]}
            keywordBoostText="Get your accurate diploma engineering exam routine here. Easy to filter, fast to download."
          />
       </div>
    </div>
  );
}

