import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Hash,
  ArrowRight,
  Search,
} from "lucide-react";
import SeoBlocks from "../components/SeoBlocks";

export default function IndividualResults() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState("diploma_in_engineering");
  const [regulation, setRegulation] = useState("2022");
  const [roll, setRoll] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (!roll) return;
    params.set("roll", roll);

    const hasMultipleRows = roll.split(/[,\s\n]+/).filter(Boolean).length > 1;
    if (hasMultipleRows) {
      params.set("type", "group");
    } else {
      params.set("type", "individual");
    }

    if (curriculum) params.set("curriculum", curriculum);
    if (regulation) params.set("regulation", regulation);

    navigate(`/result?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 py-12 font-sans relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[80px]" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>

      <div className="w-full max-w-lg mb-16 mt-8 sm:mt-0 relative z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 rotate-3 transition-transform hover:rotate-0"
          >
            <GraduationCap className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3"
          >
            BTEB{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Result
            </span>{" "}
            Portal
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-500 text-lg sm:text-xl font-medium"
          >
            Instant, accurate polytechnic results.
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.3,
            duration: 0.6,
            type: "spring",
            bounce: 0.4,
          }}
          className="bg-white/90 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl border border-slate-100/50 p-6 sm:p-8 relative z-10"
        >
          {/* Subtle top glare */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 to-white/10 pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Curriculum Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Curriculum
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  required
                  className="w-full pl-12 pr-10 py-4 bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="" disabled>
                    Select Curriculum / Exam
                  </option>
                  <option value="diploma_in_engineering">
                    Diploma In Engineering
                  </option>
                  <option value="diploma_in_engineering_army">
                    Diploma In Engineering (Army)
                  </option>
                  <option value="diploma_in_engineering_naval">
                    Diploma In Engineering (Naval)
                  </option>
                  <option value="diploma_in_textile">
                    Diploma In Textile Engineering
                  </option>
                  <option value="diploma_in_tourism">
                    Diploma In Tourism And Hospitality
                  </option>
                  <option value="diploma_in_agriculture">
                    Diploma In Agriculture
                  </option>
                  <option value="diploma_in_fisheries">
                    Diploma In Fisheries
                  </option>
                  <option value="diploma_in_forestry">
                    Diploma In Forestry
                  </option>
                  <option value="diploma_in_livestock">
                    Diploma In Livestock
                  </option>
                  <option value="certificate_in_marine_trade">
                    Certificate In Marine Trade
                  </option>
                  <option value="diploma_in_medical_technology">
                    Diploma In Medical Technology
                  </option>
                  <option value="advanced_certificate_course">
                    Advanced Certificate Course
                  </option>
                  <option value="national_skill_standard_basic">
                    National Skill Standard Basic Certificate
                  </option>
                  <option value="one_year_certificate">
                    One Year Certificate Course
                  </option>
                  <option value="diploma_in_commerce">
                    Diploma In Commerce
                  </option>
                  <option value="certificate_in_medical_ultrasound">
                    Certificate In Medical Ultrasound
                  </option>
                  <option value="hsc_bm">HSC (Business Management)</option>
                  <option value="hsc_voc">HSC (Vocational)</option>
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

            {/* Regulation Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Regulation
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="">Any</option>
                  <option value="2022">2022</option>
                  <option value="2016">2016</option>
                  <option value="2010">2010</option>
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

            {/* Roll Number Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span>Roll Number</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Required
                </span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Hash className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  placeholder="e.g. 921514"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 text-slate-900 text-base font-medium rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 placeholder-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full min-h-[56px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] px-4 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  View Result
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </div>
          </form>
        </motion.div>

        {/* Footer text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-6 text-sm text-slate-400 font-medium"
        >
          Secured connection • Official BTEB Data
        </motion.div>
      </div>
        <SeoBlocks 
          pageTitle="Diploma Result 2026 | BTEB Individual Result Check"
          metaDescription="Check your BTEB Diploma Result instantly by roll number. Fastest polytechnic semester result checking portal in Bangladesh for 2026."
          aboutTitle="About BTEB Individual Result Checker"
          aboutContent={
            <>
              <p>
                Checking your <strong>diploma result</strong> shouldn't be a hassle. During results publication days, 
                the official board websites often face heavy traffic, making it difficult for polytechnic students 
                in Bangladesh to view their grades. Our <strong>BTEB result online</strong> platform solves this by 
                providing a lightning-fast, cached infrastructure.
              </p>
              <p>
                Enter your board roll number, select your curriculum and regulation, and get your <strong>polytechnic result BD</strong> 
                instantly. We cover 2010, 2016, and 2022 probidhan across all semesters. Stay ahead and use our integrated <strong>CGPA calculator Bangladesh</strong> 
                to analyze your academic performance precisely.
              </p>
            </>
          }
          howItWorksSteps={[
            { title: "Select Curriculum", desc: "Choose Diploma in Engineering or your specific branch." },
            { title: "Choose Regulation", desc: "Select 2022, 2016, or leave it as auto-detect." },
            { title: "Enter Roll", desc: "Type your 6-digit board roll number correctly." },
            { title: "Get Instant Result", desc: "Click search and view your semester grades immediately." }
          ]}
          faqs={[
            { q: "How to check diploma result in Bangladesh?", a: "Simply visit this page, choose your respective curriculum (like Diploma in Engineering), enter your 6-digit board roll number, and hit search to instantly view your grades." },
            { q: "Is this BTEB official result?", a: "Yes, the results displayed here are fetched directly from the official BTEB servers and archives, ensuring 100% accuracy for your semester performance." },
            { q: "What should I do if the official BTEB server is down?", a: "Our platform uses optimized caching and multiple nodes. If the main server is busy, you can still check your result here smoothly without waiting." },
            { q: "When are diploma results usually published?", a: "BTEB typically publishes semester-final results 4-6 weeks after the board exams are completed. Keep an eye on our Notice section for exact dates." }
          ]}
          keywordBoostText="Access your diploma result bd instantly. The most reliable platform to check bteb result 2026 for all polytechnic institutes. We provide the fastest polytechnic result bangladesh service alongside a smart cgpa calculator bd for accurate tracking."
        />
    </div>
  );
}
