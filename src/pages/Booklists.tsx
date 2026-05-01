import { useState, useEffect, useMemo } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookCopy, Printer, ChevronRight, BookOpen, Layers, GraduationCap, Building2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';

export default function Booklists() {
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCurriculum, setActiveCurriculum] = useState<string | null>(null);
  const [activeRegulation, setActiveRegulation] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const fetchBooklists = async () => {
    try {
      const q = query(collection(db, 'booklists'), limit(2000));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooklists(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const curriculums = useMemo(() => Array.from(new Set(booklists.map(b => b.curriculum || 'Unknown'))).sort(), [booklists]);
  
  const regulations = useMemo(() => {
    if (!activeCurriculum) return [];
    return Array.from(new Set(booklists.filter(b => (b.curriculum || 'Unknown') === activeCurriculum).map(b => b.regulation || 'Unknown'))).sort().reverse();
  }, [booklists, activeCurriculum]);

  const semesters = useMemo(() => {
    if (!activeCurriculum || !activeRegulation) return [];
    return Array.from(new Set(booklists.filter(b => (b.curriculum || 'Unknown') === activeCurriculum && (b.regulation || 'Unknown') === activeRegulation).map(b => b.semester || 'Unknown'))).sort();
  }, [booklists, activeCurriculum, activeRegulation]);

  const departments = useMemo(() => {
    if (!activeCurriculum || !activeRegulation || !activeSemester) return [];
    return Array.from(new Set(booklists.filter(b => 
      (b.curriculum || 'Unknown') === activeCurriculum && 
      (b.regulation || 'Unknown') === activeRegulation && 
      (b.semester || 'Unknown') === activeSemester
    ).map(b => b.department || 'Unknown'))).sort();
  }, [booklists, activeCurriculum, activeRegulation, activeSemester]);

  const filteredSubjects = useMemo(() => {
    if (!activeCurriculum || !activeRegulation || !activeSemester || !activeDepartment) return [];
    return booklists.filter(b => 
      (b.curriculum || 'Unknown') === activeCurriculum && 
      (b.regulation || 'Unknown') === activeRegulation && 
      (b.semester || 'Unknown') === activeSemester &&
      (b.department || 'Unknown') === activeDepartment
    );
  }, [booklists, activeCurriculum, activeRegulation, activeSemester, activeDepartment]);

  // Auto-select if only one option available
  useEffect(() => {
    if (curriculums.length === 1 && !activeCurriculum) setActiveCurriculum(curriculums[0]);
  }, [curriculums, activeCurriculum]);

  useEffect(() => {
    if (regulations.length === 1 && !activeRegulation) setActiveRegulation(regulations[0]);
    else if (activeCurriculum && !regulations.includes(activeRegulation || '')) setActiveRegulation(null);
  }, [regulations, activeRegulation, activeCurriculum]);

  useEffect(() => {
    if (semesters.length === 1 && !activeSemester) setActiveSemester(semesters[0]);
    else if (activeRegulation && !semesters.includes(activeSemester || '')) setActiveSemester(null);
  }, [semesters, activeSemester, activeRegulation]);

  useEffect(() => {
    if (departments.length === 1 && !activeDepartment) setActiveDepartment(departments[0]);
    else if (activeSemester && !departments.includes(activeDepartment || '')) setActiveDepartment(null);
  }, [departments, activeDepartment, activeSemester]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    const printContent = document.getElementById('print-booklist-container');
    if (printContent) {
      // Temporarily make it visible for html2canvas
      printContent.classList.remove('hidden');
      printContent.classList.remove('print:block');
      printContent.classList.remove('fixed');
      printContent.classList.remove('inset-0');
      printContent.style.display = 'block';
      printContent.style.position = 'absolute';
      printContent.style.top = '-9999px';
      printContent.style.width = '800px';
      
      try {
        const canvas = await html2canvas(printContent, {
          scale: 2, // Higher resolution
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${activeDepartment}-${activeSemester}-Booklist.png`;
        link.click();
      } catch (err) {
        console.error("Error generating screenshot", err);
      } finally {
        // Restore classes and styles
        printContent.classList.add('hidden');
        printContent.classList.add('print:block');
        printContent.classList.add('fixed');
        printContent.classList.add('inset-0');
        printContent.style.display = '';
        printContent.style.position = '';
        printContent.style.top = '';
        printContent.style.width = '';
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 font-sans">
      <div className="mb-10 text-center print:hidden">
        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Booklists Library</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Find your required subjects and book codes easily. Select your curriculum, regulation, semester, and department to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        {/* Sidebar Filters */}
        <div className="lg:col-span-4 space-y-6">
          {/* Curriculum */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h2>Curriculum</h2>
            </div>
            <div className="space-y-2">
              {curriculums.length > 0 ? curriculums.map(curr => (
                <button
                  key={curr}
                  onClick={() => setActiveCurriculum(curr)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    activeCurriculum === curr 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {curr}
                  {activeCurriculum === curr && <ChevronRight className="w-4 h-4" />}
                </button>
              )) : (
                <p className="text-sm text-gray-400 italic">No curriculums found.</p>
              )}
            </div>
          </div>

          {/* Regulation */}
          <AnimatePresence>
            {activeCurriculum && regulations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <h2>Regulation</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {regulations.map(reg => (
                    <button
                      key={reg}
                      onClick={() => setActiveRegulation(reg)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center ${
                        activeRegulation === reg 
                          ? 'bg-indigo-500 text-white shadow-sm' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100/50'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
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
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <h2>Semester</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {semesters.map(sem => (
                    <button
                      key={sem}
                      onClick={() => setActiveSemester(sem)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeSemester === sem 
                          ? 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100/50'
                      }`}
                    >
                      {sem}
                    </button>
                  ))}
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
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
                  <Building2 className="w-5 h-5 text-orange-500" />
                  <h2>Department</h2>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {departments.map(dept => (
                    <button
                      key={dept}
                      onClick={() => setActiveDepartment(dept)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeDepartment === dept 
                          ? 'bg-orange-500 text-white shadow-sm' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100/50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
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
                className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <BookCopy className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Configure Your Booklist</h3>
                <p className="text-gray-500 max-w-sm">
                  Select curriculum, regulation, semester, and department from the sidebar to view subjects and book codes.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
              >
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
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
                    <h2 className="text-3xl font-bold mb-2">{activeDepartment}</h2>
                    <p className="text-slate-300 text-lg flex items-center gap-2">
                       {activeSemester} Semester
                    </p>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Subjects</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button
                        onClick={handleDownloadPNG}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-600/20"
                      >
                        <Download className="w-4 h-4" /> Download PNG
                      </button>
                    </div>
                  </div>

                  {filteredSubjects.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-slate-500">No subjects found for this selection.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-gray-200 text-slate-600">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-sm">Subject Name</th>
                            <th className="px-6 py-4 font-semibold text-sm w-48">Subject Code</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {filteredSubjects.map(subject => (
                            <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                    <BookCopy className="w-4 h-4" />
                                  </div>
                                  <span className="font-semibold text-gray-800">{subject.subjectName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm font-bold tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Print View Layout */}
      <div id="print-booklist-container" className="hidden print:block fixed inset-0 bg-white z-[9999] p-10">
        <div className="text-center mb-10 pb-6 border-b-2 border-gray-800">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booklist</h1>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{activeCurriculum}</h2>
          <div className="text-lg text-gray-600 font-semibold space-y-1">
            <p>{activeRegulation} Regulation</p>
            <p>{activeDepartment} - {activeSemester} Semester</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-gray-400">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm w-3/4">Subject Name</th>
              <th className="px-6 py-4 border border-gray-400 font-bold text-gray-900 text-sm">Subject Code</th>
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
  );
}

