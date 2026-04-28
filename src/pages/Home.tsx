import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function Home({ isGroup, isInstitute }: { isGroup?: boolean; isInstitute?: boolean }) {
  const [rollNumber, setRollNumber] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [regulation, setRegulation] = useState('');
  const [semester, setSemester] = useState('');
  const [examYear, setExamYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bannerConfig, setBannerConfig] = useState<{bannerUrl: string, bannerLink: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bannerUrl) {
            setBannerConfig({
              bannerUrl: data.bannerUrl,
              bannerLink: data.bannerLink || ''
            });
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const semesters = [
    "1st", "2nd", "3rd", "4th", 
    "5th", "6th", "7th", "8th"
  ];

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!isInstitute && !rollNumber.trim()) {
      setError('Please enter a valid Roll Number.');
      return;
    }
    if (isInstitute && !instituteCode.trim()) {
      setError('Please enter a valid Institute Code.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const resultsRef = collection(db, 'results');
      let q;
      
      if (isInstitute) {
        q = query(resultsRef, where('instituteCode', '==', instituteCode.trim()));
      } else if (isGroup) {
         // simple check if first roll exists to avoid empty state, but we actually just forward to the results page where multiple are fetched
         const rolls = rollNumber.split(/[,\n]/).map(r => r.trim()).filter(Boolean).slice(0, 50);
         if (rolls.length === 0) {
           setError('Please enter at least one roll number.');
           setLoading(false);
           return;
         }
         q = query(resultsRef, where('rollNumber', 'in', rolls.slice(0, 10))); // query max 10 for validation
      } else {
        q = query(resultsRef, where('rollNumber', '==', rollNumber.trim()));
      }
      
      // Just check if any exist
      const querySnapshot = await getDocs(query(q, limit(1)));
      
      if (querySnapshot.empty) {
        setError('No result found for your query. Please check your inputs.');
      } else {
        const queryParams = new URLSearchParams();
        if (isInstitute) queryParams.set('instituteCode', instituteCode.trim());
        else queryParams.set('roll', rollNumber.trim());
        
        if (semester) queryParams.set('semester', semester);
        if (examYear) queryParams.set('examYear', examYear);
        queryParams.set('type', isInstitute ? 'institute' : isGroup ? 'group' : 'individual');
        
        if (curriculum) queryParams.set('curriculum', curriculum);
        if (regulation) queryParams.set('regulation', regulation);
        
        navigate(`/result?${queryParams.toString()}`);
      }
    } catch (err) {
      console.error(err);
      setError('Error checking result. Please try again or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isInstitute) return "Institute Results";
    return "Find Your BTEB Result Instantly";
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-0">
      <div className="text-center mb-10">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 tracking-wide uppercase">
          {isInstitute ? "Institute Portal" : "Student Portal"}
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          {getTitle()}
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto">
          Get your 100% accurate Polytechnic results. Fast, reliable, and easy to download or share.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-3xl rounded-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-6 sm:p-10">
          <form onSubmit={handleSearch} className="space-y-6 sm:space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border border-red-100 rounded-xl flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <span>{error}</span>
              </div>
            )}
            
            {isInstitute ? (
              <div>
                <label htmlFor="instituteCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Institute Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="instituteCode"
                  value={instituteCode}
                  onChange={(e) => setInstituteCode(e.target.value)}
                  className="block w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm"
                  placeholder="e.g. 50117"
                  required
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="curriculum" className="block text-sm font-medium text-gray-700 mb-2">
                      Curriculum / Exam <span className="text-red-500">*</span>
                    </label>
                      <div className="relative">
                        <select
                          id="curriculum"
                          value={curriculum}
                          onChange={(e) => setCurriculum(e.target.value)}
                          className="block w-full px-4 py-3.5 pr-10 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-700 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm appearance-none"
                          required
                        >
                          <option value="" disabled>Select Curriculum / Exam</option>
                          <option value="Diploma in Engineering">Diploma in Engineering</option>
                          <option value="Diploma in Textile">Diploma in Textile</option>
                          <option value="Diploma in Agriculture">Diploma in Agriculture</option>
                          <option value="Diploma in Fisheries">Diploma in Fisheries</option>
                          <option value="Diploma in Forestry">Diploma in Forestry</option>
                          <option value="Diploma in Medical Technology">Diploma in Medical Technology</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="regulation" className="block text-sm font-medium text-gray-700 mb-2">
                        Regulation
                      </label>
                      <div className="relative">
                        <select
                          id="regulation"
                          value={regulation}
                          onChange={(e) => setRegulation(e.target.value)}
                          className="block w-full px-4 py-3.5 pr-10 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-700 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm appearance-none"
                        >
                          <option value="">Any Regulation</option>
                          <option value="2022">2022</option>
                          <option value="2016">2016</option>
                          <option value="2010">2010</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Roll Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="rollNumber"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="block w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm font-medium tracking-wide"
                    placeholder="Enter roll number (e.g. 921514)"
                    required
                  />
                </div>
              </div>
            )}

            {isInstitute && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                    Semester (Optional)
                  </label>
                  <div className="relative">
                    <select
                      id="semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="block w-full px-4 py-3.5 pr-10 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-700 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm appearance-none"
                    >
                      <option value="">Any Semester</option>
                      {semesters.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="examYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Year (Optional)
                  </label>
                  <input
                    type="text"
                    id="examYear"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    className="block w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white focus:bg-white shadow-sm"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>
            )}

            <div className="pt-6 sm:pt-8 mt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-4">
              <button
                onClick={() => {
                  setRollNumber(''); setInstituteCode(''); setSemester(''); setExamYear(''); setCurriculum(''); setRegulation(''); setError('');
                }}
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-gray-600 bg-transparent rounded-xl hover:bg-gray-100 transition-colors"
                type="button"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full sm:w-auto flex justify-center items-center px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all",
                  loading 
                    ? "bg-blue-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    View Result
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {bannerConfig?.bannerUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="mt-12 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100"
        >
          {bannerConfig.bannerLink ? (
             <a href={bannerConfig.bannerLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                <img src={bannerConfig.bannerUrl} alt="Ad Banner" className="w-full object-cover" />
             </a>
          ) : (
             <img src={bannerConfig.bannerUrl} alt="Ad Banner" className="w-full object-cover" />
          )}
        </motion.div>
      )}
    </div>
  );
}
