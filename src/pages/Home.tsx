import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState('diploma_in_engineering');
  const [regulation, setRegulation] = useState('');
  const [roll, setRoll] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roll) return;
    
    const params = new URLSearchParams({ roll });
    if (curriculum) params.set('curriculum', curriculum);
    if (regulation) params.set('regulation', regulation);
    
    navigate(`/result?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-0">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          BTEB Result Check
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          Get your 100% accurate Polytechnic results down below.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-md mx-auto bg-white shadow-sm sm:rounded-xl border border-gray-200 p-6 sm:p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Curriculum / Exam
            </label>
            <div className="relative">
              <select 
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none bg-white"
              >
                <option value="diploma_in_engineering">Diploma in Engineering</option>
                <option value="diploma_in_textile">Diploma in Textile Engineering</option>
                <option value="diploma_in_agriculture">Diploma in Agriculture</option>
                <option value="diploma_in_marine">Diploma in Marine Engineering</option>
                <option value="hsc_bm">HSC (Business Management)</option>
                <option value="hsc_voc">HSC (Vocational)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Regulation
            </label>
            <div className="relative">
              <select 
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none bg-white"
              >
                <option value="">Any</option>
                <option value="2022">2022</option>
                <option value="2016">2016</option>
                <option value="2010">2010</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 border-b border-transparent">
              Roll Number <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="Enter roll number (e.g. 921514)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <button 
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            View Result
          </button>
        </form>
      </motion.div>
    </div>
  );
}
