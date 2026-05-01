import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Calculator, ArrowRight, GraduationCap, CalendarRange, BookCopy } from 'lucide-react';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<{ url: string; link: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (isMounted && docSnap.exists()) {
          const data = docSnap.data();
          if (data.bannerUrl) {
            setBanner({ url: data.bannerUrl, link: data.bannerLink || '' });
          }
        }
      } catch (error) {
        if(error instanceof Error && String(error.message).includes('the client is offline')) {
           // Silently ignore offline error for settings fetch
        } else if (String(error).includes('the client is offline')) {
           // Silently ignore offline error for settings fetch
        } else {
           console.error("Error fetching settings:", error);
        }
      }
    };
    fetchSettings().catch(error => {
       console.error("Unhandled promise rejection in fetchSettings:", error);
    });
    return () => { isMounted = false; };
  }, []);

  const features = [
    {
      title: "Individual Result",
      description: "Quickly view detailed individual polytechnic results for any semester.",
      icon: <Search className="w-8 h-8" strokeWidth={1.5} />,
      color: "blue",
      path: "/individual-results",
      actionText: "Start Check"
    },
    {
      title: "Group Result",
      description: "Check multiple results at once using a roll number range.",
      icon: <Users className="w-8 h-8" strokeWidth={1.5} />,
      color: "indigo",
      path: "/group-results",
      actionText: "Start Check"
    },
    {
      title: "CGPA Calculator",
      description: "Calculate your final CGPA using semester-wise weights automatically.",
      icon: <Calculator className="w-8 h-8" strokeWidth={1.5} />,
      color: "emerald",
      path: "/calculator",
      actionText: "Calculate"
    },
    {
      title: "Exam Routines",
      description: "Browse and download your upcoming exam schedules.",
      icon: <CalendarRange className="w-8 h-8" strokeWidth={1.5} />,
      color: "purple",
      path: "/exam-routines",
      actionText: "View Routines"
    },
    {
      title: "Booklists",
      description: "Find complete semester-wise subject and book code lists.",
      icon: <BookCopy className="w-8 h-8" strokeWidth={1.5} />,
      color: "pink",
      path: "/booklists",
      actionText: "Browse Books"
    }
  ];

  return (
    <div className="flex flex-col items-center w-full px-4 sm:px-6 py-12 font-sans">
      <div className="w-full max-w-5xl my-auto mb-8">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/20 rotate-3 transition-transform hover:rotate-0"
          >
            <GraduationCap className="w-10 h-10" strokeWidth={1.5} />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4"
          >
            BTEB <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Result</span> Portal
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-500 text-xl max-w-2xl mx-auto font-medium"
          >
            A powerful, fast, and easy-to-use platform to get your Polytechnic results accurately.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + (idx * 0.1), duration: 0.6, type: "spring", bounce: 0.4 }}
              onClick={() => navigate(feature.path)}
            >
              <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl border border-white/60 p-8 h-full flex flex-col relative cursor-pointer group hover:-translate-y-2 transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl"></div>
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shrink-0
                  ${feature.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                    feature.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
                    feature.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
                    feature.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                    'bg-pink-50 text-pink-600'} 
                  group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 font-medium mb-8 flex-1">
                  {feature.description}
                </p>

                <div className="mt-auto flex items-center text-sm font-bold text-slate-900 pt-4">
                  <span className="group-hover:text-blue-600 transition-colors">{feature.actionText}</span>
                  <ArrowRight className="w-4 h-4 ml-2 max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 text-blue-600" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {banner && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-12 w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50 border border-white/60 relative group"
          >
            {banner.link ? (
              <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block relative">
                <img src={banner.url} alt="Highlight" className="w-full h-auto object-cover max-h-[300px] scale-100 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
              </a>
            ) : (
              <img src={banner.url} alt="Highlight" className="w-full h-auto object-cover max-h-[300px]" />
            )}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Sponsored
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
