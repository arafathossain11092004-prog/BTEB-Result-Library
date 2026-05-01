import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Calendar, Hash, ArrowRight, Search } from 'lucide-react';

export default function IndividualResults() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState('diploma_in_engineering');
  const [regulation, setRegulation] = useState('2022');
  const [roll, setRoll] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (!roll) return;
    params.set('roll', roll);
    
    const hasMultipleRows = roll.split(/[,\s\n]+/).filter(Boolean).length > 1;
    if (hasMultipleRows) {
      params.set('type', 'group');
    } else {
      params.set('type', 'individual');
    }
    
    if (curriculum) params.set('curriculum', curriculum);
    if (regulation) params.set('regulation', regulation);
    
    navigate(`/result?${params.toString()}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-slate-50 font-sans px-4 sm:px-6">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 z-0 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-lg mb-16 mt-8 sm:mt-0">
        
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
            BTEB <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Result</span> Portal
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
          transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
          className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-3xl border border-white/60 p-6 sm:p-8 relative"
        >
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl"></div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Curriculum Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Curriculum
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <select 
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  required
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-800 text-base rounded-xl transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Curriculum / Exam</option>
                  <option value="diploma_in_engineering">Diploma In Engineering</option>
                  <option value="diploma_in_engineering_army">Diploma In Engineering (Army)</option>
                  <option value="diploma_in_engineering_naval">Diploma In Engineering (Naval)</option>
                  <option value="diploma_in_textile">Diploma In Textile Engineering</option>
                  <option value="diploma_in_tourism">Diploma In Tourism And Hospitality</option>
                  <option value="diploma_in_agriculture">Diploma In Agriculture</option>
                  <option value="diploma_in_fisheries">Diploma In Fisheries</option>
                  <option value="diploma_in_forestry">Diploma In Forestry</option>
                  <option value="diploma_in_livestock">Diploma In Livestock</option>
                  <option value="certificate_in_marine_trade">Certificate In Marine Trade</option>
                  <option value="diploma_in_medical_technology">Diploma In Medical Technology</option>
                  <option value="advanced_certificate_course">Advanced Certificate Course</option>
                  <option value="national_skill_standard_basic">National Skill Standard Basic Certificate</option>
                  <option value="one_year_certificate">One Year Certificate Course</option>
                  <option value="diploma_in_commerce">Diploma In Commerce</option>
                  <option value="certificate_in_medical_ultrasound">Certificate In Medical Ultrasound</option>
                  <option value="hsc_bm">HSC (Business Management)</option>
                  <option value="hsc_voc">HSC (Vocational)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Regulation Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Regulation
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <select 
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-800 text-base rounded-xl transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">Any</option>
                  <option value="2022">2022</option>
                  <option value="2016">2016</option>
                  <option value="2010">2010</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Roll Number Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span>Roll Number</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Required</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Hash className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  required
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  placeholder="e.g. 921514 (Supports multiple comma-separated)"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-900 text-base rounded-xl transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit"
                className="group relative w-full flex items-center justify-center gap-2 py-4 px-4 text-base font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-lg shadow-slate-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  View Result
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
                {/* Subtle shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"></div>
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
    </div>
  );
}
