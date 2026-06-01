import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Calculator as CalcIcon,
  RefreshCw,
  Loader2,
  BookOpen,
  Calendar,
  Hash,
} from "lucide-react";
import { motion } from "motion/react";
import SeoBlocks from "../components/SeoBlocks";

const WEIGHTS: Record<string, number[]> = {
  "2010": [0.05, 0.05, 0.05, 0.15, 0.15, 0.2, 0.25, 0.1],
  "2016": [0.05, 0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.15],
  "2022": [0.05, 0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1],
};

const parseGPA = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed.type === "passed") {
        const gpa = parseFloat(parsed.gpa);
        return isNaN(gpa) ? "" : gpa.toFixed(2);
      }
      return "";
    } catch (e) {
      if (val.startsWith('{"type":"referred"')) return "";
      const gpa = parseFloat(val);
      return isNaN(gpa) ? "" : gpa.toFixed(2);
    }
  }
  const gpa = parseFloat(val);
  return isNaN(gpa) ? "" : gpa.toFixed(2);
};

export default function Calculator() {
  const [regulation, setRegulation] = useState<string>("2022");
  const [gpas, setGpas] = useState<string[]>(Array(8).fill(""));
  const [cgpaResult, setCgpaResult] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState<
    number | null
  >(null);

  // Autofill states
  const [curriculum, setCurriculum] = useState("Diploma in Engineering");
  const [autoRegulation, setAutoRegulation] = useState("2022");
  const [rollNumber, setRollNumber] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const handleGpaChange = (index: number, value: string) => {
    const newGpas = [...gpas];
    newGpas[index] = value;
    setGpas(newGpas);
    setCgpaResult(null); // hide result on change
    setEarnedPoints(null);
    setCompletionPercentage(null);
  };

  const resetCalculator = () => {
    setGpas(Array(8).fill(""));
    setCgpaResult(null);
    setEarnedPoints(null);
    setCompletionPercentage(null);
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
      setCgpaResult("0.00");
      setEarnedPoints("0.00");
      setCompletionPercentage(0);
    } else {
      setCgpaResult((totalPoints / totalWeight).toFixed(2));
      setEarnedPoints(totalPoints.toFixed(3)); // use 3 decimals for intermediate
      setCompletionPercentage(Math.round(totalWeight * 100));
    }
  };

  const extractGPAFromAPI = (data: any, semNumber: number) => {
    if (!data || !data.semesterResults) return "";
    const semData = data.semesterResults.find(
      (s: any) => s.semester === semNumber,
    );
    if (!semData || !semData.results || semData.results.length === 0) return "";

    // Check for failed subjects in this semester
    const failedInThisSem = (data.currentFailedSubjects || []).filter(
      (f: any) => f.originSemester === semNumber,
    );
    if (failedInThisSem.length > 0) return ""; // Has referred

    // Use specific gpa field to prevent fetching cgpa which might overwrite true semester gpa in 8th semester
    const gpa = semData.results[0].gpa || semData.results[0].cgpa;
    if (gpa === "Passed") return "";
    return parseGPA(gpa);
  };

  const handleAutofill = async () => {
    if (!curriculum || !autoRegulation || !rollNumber) {
      setError("Please fill all autofill fields.");
      return;
    }
    setError("");
    setFetching(true);
    try {
      let firebaseResults: any[] = [];
      try {
        const resultsRef = collection(db, "results");
        const q = query(
          resultsRef,
          where("rollNumber", "==", rollNumber),
          // Removing strict curriculum/regulation match as it could fail due to formatting differences
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            if (
              doc.data().curriculum === curriculum ||
              doc.data().curriculum === "Diploma in Engineering"
            ) {
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
        if (curriculum === "Diploma in Engineering")
          mappedCurriculum = "diploma_in_engineering";
        if (curriculum === "Diploma in Textile Engineering")
          mappedCurriculum = "diploma_in_textile";
        if (curriculum === "Diploma in Agriculture")
          mappedCurriculum = "diploma_in_agriculture";
        if (curriculum === "Diploma in Fisheries")
          mappedCurriculum = "diploma_in_fisheries";
        if (curriculum === "Diploma in Forestry")
          mappedCurriculum = "diploma_in_forestry";
        if (curriculum === "Diploma in Medical Technology")
          mappedCurriculum = "diploma_in_medical_technology";

        const apiUrl = `/api/results?roll=${rollNumber}&curriculumId=${mappedCurriculum}&regulation=${autoRegulation}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("API fetch failed");
        const resultData = await response.json();

        if (
          resultData.success &&
          resultData.data &&
          resultData.data.length > 0
        ) {
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
        let newGpas = Array(8).fill("");

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
        setEarnedPoints(null);
        setCompletionPercentage(null);
      } else {
        setError("No results found for this Roll Number.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch results.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="w-full font-sans px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[80px]" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto space-y-8 relative z-10">
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
            CGPA{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Calculator
            </span>
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
          transition={{
            delay: 0.3,
            duration: 0.6,
            type: "spring",
            bounce: 0.4,
          }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* CGPA Calculator Main Card */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-2xl border border-slate-100/50 rounded-3xl p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 flex flex-col justify-between">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />
            <div className="text-center mb-8 relative z-10">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                CGPA Calculator
              </h1>
              <p className="text-sm text-gray-500">
                Calculate your Cumulative Grade Point Average
              </p>
            </div>

            <div className="mb-6 relative z-10">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Regulation
              </label>
              <div className="relative group max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none cursor-pointer transition-all focus:bg-white"
                >
                  <option value="2010">2010</option>
                  <option value="2016">2016</option>
                  <option value="2022">2022</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                    {i + 1}
                    {i === 0
                      ? "st"
                      : i === 1
                        ? "nd"
                        : i === 2
                          ? "rd"
                          : "th"}{" "}
                    Sem
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.01"
                    value={gpas[i]}
                    onChange={(e) => handleGpaChange(i, e.target.value)}
                    className="w-full px-3 py-3 text-center text-base font-medium border border-slate-200 rounded-2xl bg-slate-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            {cgpaResult !== null &&
              completionPercentage !== null &&
              earnedPoints !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 p-6 bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100/60 rounded-2xl shadow-inner flex flex-col items-center"
                >
                  {completionPercentage === 100 ? (
                    <>
                      <p className="text-sm text-blue-600 font-bold uppercase tracking-widest mb-1.5">
                        Your Final CGPA
                      </p>
                      <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">
                        {cgpaResult}
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="bg-white/60 px-4 py-2 rounded-full border border-blue-100/80 mb-6 shadow-sm">
                        <p className="text-sm font-semibold text-slate-700">
                          Course completed:{" "}
                          <span className="text-blue-600 font-bold">
                            {completionPercentage}%
                          </span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-lg text-center divide-y md:divide-y-0 md:divide-x divide-blue-200">
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1.5">
                            Earned Points / 4.00
                          </p>
                          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 mb-2">
                            {earnedPoints}
                          </h2>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Exact sum without assumption
                          </p>
                        </div>

                        <div className="flex flex-col items-center pt-8 md:pt-0">
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1.5">
                            Current Average
                          </p>
                          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 mb-2">
                            {cgpaResult}
                          </h2>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Calculated out of {completionPercentage}%
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

            <div className="flex justify-between items-center bg-slate-50/50 -mx-6 md:-mx-8 -my-6 md:-my-8 mt-4 p-4 md:p-6 rounded-b-3xl border-t border-slate-100 relative z-10">
              <button
                onClick={calculateCGPA}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-base font-bold shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center group"
              >
                <span className="flex items-center gap-2">
                  <CalcIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />{" "}
                  Calculate
                </span>
              </button>
              <button
                onClick={resetCalculator}
                className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Autofill Card */}
          <div className="lg:col-span-1 bg-white/90 backdrop-blur-2xl border border-slate-100/50 rounded-3xl p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col relative z-10">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />

            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
              Auto-Fill
            </h2>

            <div className="space-y-5 flex-1 relative z-10">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Curriculum
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    className="w-full pl-12 pr-8 py-3.5 bg-slate-50/50 text-sm font-medium border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white appearance-none cursor-pointer transition-all"
                  >
                    <option value="">Select curriculum</option>
                    <option value="Diploma in Engineering">
                      Diploma in Engineering
                    </option>
                    <option value="Diploma in Tourism and Hospitality">
                      Diploma in Tourism & Hospitality
                    </option>
                    <option value="Diploma in Textile Engineering">
                      Diploma in Textile Engineering
                    </option>
                    <option value="Diploma in Agriculture">
                      Diploma in Agriculture
                    </option>
                    <option value="Diploma in Fisheries">
                      Diploma in Fisheries
                    </option>
                    <option value="Diploma in Forestry">
                      Diploma in Forestry
                    </option>
                    <option value="Diploma in Medical Technology">
                      Diploma in Medical Technology
                    </option>
                    <option value="Certificate in Marine Trade">
                      Certificate in Marine Trade
                    </option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Regulation
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <select
                    value={autoRegulation}
                    onChange={(e) => setAutoRegulation(e.target.value)}
                    className="w-full pl-12 pr-8 py-3.5 bg-slate-50/50 text-sm font-medium border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white appearance-none cursor-pointer transition-all"
                  >
                    <option value="2010">2010</option>
                    <option value="2016">2016</option>
                    <option value="2022">2022</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Roll Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Hash className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 text-sm font-medium border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white placeholder:text-slate-400 transition-all"
                    placeholder="Enter your roll number"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium pt-2">{error}</p>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 relative z-10">
              <button
                onClick={handleAutofill}
                disabled={fetching}
                className="w-full bg-blue-600 text-white px-4 py-4 rounded-2xl text-base font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  {fetching ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    "Fill Up Results"
                  )}
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Priorities Table */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.4,
            duration: 0.6,
            type: "spring",
            bounce: 0.4,
          }}
          className="bg-white/90 backdrop-blur-2xl border border-slate-100/50 rounded-3xl p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 mt-8"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />

          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center md:text-left relative z-10">
            Semester-Wise GPA Priorities
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 relative z-10">
            <table className="w-full text-center text-sm md:text-base">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">
                    Semester
                  </th>
                  <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">
                    2010
                  </th>
                  <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">
                    2016
                  </th>
                  <th className="py-4 px-4 font-semibold text-slate-700 uppercase tracking-wide text-xs">
                    2022
                  </th>
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
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {row.sem}
                    </td>
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
        <SeoBlocks 
          pageTitle="Diploma CGPA Calculator 2026 | Accurate BTEB Result Calculator"
          metaDescription="Calculate your Diploma CGPA easily using our BTEB CGPA Calculator. 2016 and 2022 probidhan supported with 100% accurate pro-rata calculation."
          aboutTitle="About BTEB CGPA Calculator"
          aboutContent={
            <>
              <p>
                Manually computing cumulative grades under the BTEB grading matrix can be highly prone to errors, primarily due to the intricate percentage distributions of the pro-rata system. Our advanced <strong>diploma cgpa calculator</strong> performs this complex mathematical process automatically, enabling students to evaluate their precise cumulative academic standing within seconds.
              </p>
              <p>
                Designed to fully accommodate the 2010, 2016, and the latest 2022 probidhan, this <strong>bteb result calculator</strong> integrates the official <strong>bteb pro-rata calculation</strong> weightages for every individual semester. You can input your SGPAs manually or leverage our automated data retrieval feature to guarantee a flawlessly accurate final calculation without any manual guesswork.
              </p>
            </>
          }
          howItWorksSteps={[
            { title: "Select Regulation", desc: "Choose your probidhan (2010, 2016, or 2022)." },
            { title: "Input Semester GPA", desc: "Enter your GPA for each completed semester." },
            { title: "Auto-Fill Fetch", desc: "Alternatively, use your Roll to fetch your results automatically." },
            { title: "Instant Calculation", desc: "Click calculate to view your exact CGPA down to the decimals." }
          ]}
          faqs={[
            { q: "How does the BTEB diploma CGPA calculator work?", a: "It uses the official BTEB pro-rata formula, assigning specific percentage weights to each semester's GPA depending on your regulation (2022 or 2016) to find your cumulative GPA." },
            { q: "What is the passing CGPA for diploma engineering?", a: "To successfully pass and receive your diploma certificate, you need to maintain a minimum CGPA of 2.00 out of 4.00, and clear all semester subjects." },
            { q: "Can this tool calculate incomplete semesters?", a: "Yes. It calculates your current average score based only on the semesters you have completed, showing your ongoing CGPA progress accurately." }
          ]}
          keywordBoostText="Eliminate the complexity of manual grading equations. Rely on our sophisticated diploma cgpa calculator bd to continuously monitor your educational progress. This advanced bteb result calculator perfectly implements official bteb pro-rata calculation standards for all engineering students."
        />
    </div>
  );
}
