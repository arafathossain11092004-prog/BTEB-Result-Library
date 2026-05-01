import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calculator as CalcIcon, RefreshCw, Loader2, BookOpen, Calendar, Hash } from 'lucide-react';
import { motion } from 'motion/react';

const WEIGHTS: Record<string, number[]> = {
  '2010': [0.05, 0.05, 0.05, 0.15, 0.15, 0.20, 0.25, 0.10],
  '2016': [0.05, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.15],
  '2022': [0.05, 0.05, 0.10, 0.10, 0.20, 0.20, 0.20, 0.10],
};

const parseGPA = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed.type === 'passed') {
        const gpa = parseFloat(parsed.gpa);
        return isNaN(gpa) ? '' : gpa.toFixed(2);
      }
      return '';
    } catch (e) {
      if (val.startsWith('{"type":"referred"')) return '';
      const gpa = parseFloat(val);
      return isNaN(gpa) ? '' : gpa.toFixed(2);
    }
  }
  const gpa = parseFloat(val);
  return isNaN(gpa) ? '' : gpa.toFixed(2);
};

export default function Calculator() {
  const [regulation, setRegulation] = useState<string>('2022');
  const [gpas, setGpas] = useState<string[]>(Array(8).fill(''));
  const [cgpaResult, setCgpaResult] = useState<string | null>(null);

  // Autofill states
  const [curriculum, setCurriculum] = useState('');
  const [autoRegulation, setAutoRegulation] = useState('2022');
  const [rollNumber, setRollNumber] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const handleGpaChange = (index: number, value: string) => {
    const newGpas = [...gpas];
    newGpas[index] = value;
    setGpas(newGpas);
    setCgpaResult(null); // hide result on change
  };

  const resetCalculator = () => {
    setGpas(Array(8).fill(''));
    setCgpaResult(null);
  };

  const calculateCGPA = () => {
    const w = WEIGHTS[regulation];
    if (!w) return;

    let totalPoints = 0;
    let totalWeight = 0;

    for (let i = 0; i < 8; i++) {
      const val = parseFloat(gpas[i]);
      if (!isNaN(val) && val > 0 && val <= 4.0) {
        totalPoints += val * w[i];
        totalWeight += w[i];
      }
    }

    if (totalWeight === 0) {
      setCgpaResult('0.00');
    } else {
      setCgpaResult((totalPoints / totalWeight).toFixed(2));
    }
  };

  const extractGPAFromAPI = (data: any, semNumber: number) => {
    if (!data || !data.semesterResults) return '';
    const semData = data.semesterResults.find((s: any) => s.semester === semNumber);
    if (!semData || !semData.results || semData.results.length === 0) return '';
    
    // Check for failed subjects in this semester
    const failedInThisSem = (data.currentFailedSubjects || []).filter((f: any) => f.originSemester === semNumber);
    if (failedInThisSem.length > 0) return ''; // Has referred

    const gpa = semData.results[0].cgpa || semData.results[0].gpa;
    if (gpa === 'Passed') return '';
    return parseGPA(gpa);
  };

  const handleAutofill = async () => {
    if (!curriculum || !autoRegulation || !rollNumber) {
      setError('Please fill all autofill fields.');
      return;
    }
    setError('');
    setFetching(true);
    try {
      let firebaseResults: any[] = [];
      try {
        const resultsRef = collection(db, 'results');
        const q = query(
          resultsRef,
          where('rollNumber', '==', rollNumber)
          // Removing strict curriculum/regulation match as it could fail due to formatting differences
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
           snapshot.forEach((doc) => {
               if (doc.data().curriculum === curriculum || doc.data().curriculum === 'Diploma in Engineering') {
                   firebaseResults.push(doc.data());
               }
           });
        }
      } catch (dbErr) {
        console.warn("Firebase query failed:", dbErr);
      }

      let dataToUse: any = null;
      let isFromApi = false;

      if (firebaseResults.length > 0) {
        dataToUse = firebaseResults[0];
      } else {
        // Fallback to API Proxy
        let mappedCurriculum = curriculum;
        if (curriculum === 'Diploma in Engineering') mappedCurriculum = 'diploma_in_engineering';
        if (curriculum === 'Diploma in Textile Engineering') mappedCurriculum = 'diploma_in_textile';
        if (curriculum === 'Diploma in Agriculture') mappedCurriculum = 'diploma_in_agriculture';
        if (curriculum === 'Diploma in Fisheries') mappedCurriculum = 'diploma_in_fisheries';
        if (curriculum === 'Diploma in Forestry') mappedCurriculum = 'diploma_in_forestry';
        if (curriculum === 'Diploma in Medical Technology') mappedCurriculum = 'diploma_in_medical_technology';

        const apiUrl = `/api/results?roll=${rollNumber}&curriculumId=${mappedCurriculum}&regulation=${autoRegulation}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('API fetch failed');
        const resultData = await response.json();
        
        if (resultData.success && resultData.data && resultData.data.length > 0) {
          dataToUse = resultData.data[0];
          isFromApi = true;
        } else if (Array.isArray(resultData) && resultData.length > 0) {
          dataToUse = resultData[0];
          isFromApi = true;
        } else if (resultData && resultData.roll) {
           // Direct single result
           dataToUse = resultData;
           isFromApi = true;
        }
      }

      if (dataToUse) {
        let newGpas = Array(8).fill('');
        
        if (isFromApi) {
          newGpas = [
            extractGPAFromAPI(dataToUse, 1),
            extractGPAFromAPI(dataToUse, 2),
            extractGPAFromAPI(dataToUse, 3),
            extractGPAFromAPI(dataToUse, 4),
            extractGPAFromAPI(dataToUse, 5),
            extractGPAFromAPI(dataToUse, 6),
            extractGPAFromAPI(dataToUse, 7),
            extractGPAFromAPI(dataToUse, 8),
          ];
        } else {
          newGpas = [
            parseGPA(dataToUse.semester1),
            parseGPA(dataToUse.semester2),
            parseGPA(dataToUse.semester3),
            parseGPA(dataToUse.semester4),
            parseGPA(dataToUse.semester5),
            parseGPA(dataToUse.semester6),
            parseGPA(dataToUse.semester7),
            parseGPA(dataToUse.semester8),
          ];
        }
        
        setGpas(newGpas);
        setRegulation(autoRegulation);
        setCgpaResult(null);
      } else {
        setError('No results found for this Roll Number.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch results.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="w-full font-sans px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        
        <div className="text-center mb-10 pt-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 rotate-3 transition-transform hover:rotate-0"
          >
            <CalcIcon className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3"
          >
            CGPA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Calculator</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-500 text-lg sm:text-xl font-medium"
          >
            Calculate or automatically fetch your CGPA
          </motion.p>
        </div>

      {/* Top Grid */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        
        {/* CGPA Calculator Main Card */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl"></div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">CGPA Calculator</h1>
            <p className="text-sm text-gray-500">Calculate your Cumulative Grade Point Average</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Regulation</label>
            <div className="relative group max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-5 h-5" />
              </div>
              <select
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50/50 border border-slate-200 text-slate-800 text-base rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="2010">2010</option>
                <option value="2016">2016</option>
                <option value="2022">2022</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Sem
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={gpas[i]}
                  onChange={(e) => handleGpaChange(i, e.target.value)}
                  className="w-full px-3 py-3 text-center text-base font-medium border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-colors placeholder:text-slate-300"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>

          {cgpaResult !== null && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="mb-8 p-6 bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100/60 rounded-2xl text-center shadow-inner"
             >
               <p className="text-sm text-blue-600 font-bold uppercase tracking-widest mb-1.5">Your Final CGPA</p>
               <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">{cgpaResult}</h2>
             </motion.div>
          )}

          <div className="flex justify-between items-center bg-slate-50/50 -mx-6 md:-mx-8 -my-6 md:-my-8 mt-4 p-4 md:p-6 rounded-b-[22px] border-t border-slate-100">
            <button
              onClick={calculateCGPA}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl text-base font-bold shadow-lg shadow-slate-900/10 hover:bg-black transition-all flex items-center group"
            >
              <span className="flex items-center gap-2">
                <CalcIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Calculate
              </span>
            </button>
            <button
              onClick={resetCalculator}
              className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Autofill Card */}
        <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl"></div>

          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            Auto-Fill
          </h2>
          
          <div className="space-y-5 flex-1">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Curriculum</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/50 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white appearance-none cursor-pointer"
                >
                  <option value="">Select curriculum</option>
                  <option value="Diploma in Engineering">Diploma in Engineering</option>
                  <option value="Diploma in Tourism and Hospitality">Diploma in Tourism & Hospitality</option>
                  <option value="Diploma in Textile Engineering">Diploma in Textile Engineering</option>
                  <option value="Diploma in Agriculture">Diploma in Agriculture</option>
                  <option value="Diploma in Fisheries">Diploma in Fisheries</option>
                  <option value="Diploma in Forestry">Diploma in Forestry</option>
                  <option value="Diploma in Medical Technology">Diploma in Medical Technology</option>
                  <option value="Certificate in Marine Trade">Certificate in Marine Trade</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Regulation</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <select
                  value={autoRegulation}
                  onChange={(e) => setAutoRegulation(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/50 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white appearance-none cursor-pointer"
                >
                  <option value="2010">2010</option>
                  <option value="2016">2016</option>
                  <option value="2022">2022</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Roll Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white placeholder:text-slate-400"
                  placeholder="Enter your roll number"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium pt-2">{error}</p>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={handleAutofill}
              disabled={fetching}
              className="w-full bg-blue-600 text-white px-4 py-3.5 rounded-xl text-base font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center">
                {fetching ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Fill Up Results"}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"></div>
            </button>
          </div>
        </div>

      </motion.div>

      {/* Priorities Table */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, type: "spring", bounce: 0.4 }}
        className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>
        
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center md:text-left">Semester-Wise GPA Priorities</h2>
        
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-center text-sm md:text-base">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">Semester</th>
                <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">2010</th>
                <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">2016</th>
                <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">2022</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { sem: "1st", p10: "5%", p16: "5%", p22: "5%" },
                { sem: "2nd", p10: "5%", p16: "5%", p22: "5%" },
                { sem: "3rd", p10: "5%", p16: "5%", p22: "10%" },
                { sem: "4th", p10: "15%", p16: "10%", p22: "10%" },
                { sem: "5th", p10: "15%", p16: "15%", p22: "20%" },
                { sem: "6th", p10: "20%", p16: "20%", p22: "20%" },
                { sem: "7th", p10: "25%", p16: "25%", p22: "20%" },
                { sem: "8th", p10: "10%", p16: "15%", p22: "10%" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">{row.sem}</td>
                  <td className="py-3 px-4 text-slate-600">{row.p10}</td>
                  <td className="py-3 px-4 text-slate-600">{row.p16}</td>
                  <td className="py-3 px-4 text-slate-600">{row.p22}</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50/80 border-t-2 border-slate-100">
                <td className="py-4 px-4 text-slate-900">Total</td>
                <td className="py-4 px-4 text-slate-900">100%</td>
                <td className="py-4 px-4 text-slate-900">100%</td>
                <td className="py-4 px-4 text-slate-900">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
    </div>
  );
}
