import { BookOpen, Calculator, CalendarClock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function About() {
  return (
    <div className="w-full font-sans px-4 sm:px-6 py-12">
      <Helmet>
        <title>About Us | BTEB Result Library</title>
        <meta name="description" content="Learn about BTEB Result Library - our mission to provide the fastest diploma results, CGPA calculator, and resources for Bangladesh Technical Education Board students." />
        <link rel="canonical" href="https://btebresultlibrary.vercel.app/about" />
      </Helmet>
      
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
        <div className="bg-white/80 border-b border-slate-100 px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">About BTEB Result Library</h1>
        </div>
        
        <div className="p-8 space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              We aim to provide a fast, reliable, and user-friendly BTEB result checking system for students in Bangladesh. Finding exam results shouldn't be a struggle, and we exist to streamline that experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Core Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <BookOpen className="w-8 h-8 text-indigo-500 mb-3" />
                <h3 className="font-semibold text-slate-900">Diploma Results</h3>
                <p className="text-sm text-slate-500 mt-2">Check individual and group semester results instantly.</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <Calculator className="w-8 h-8 text-emerald-500 mb-3" />
                <h3 className="font-semibold text-slate-900">CGPA Calculator</h3>
                <p className="text-sm text-slate-500 mt-2">Accurately calculate your CGPA across multiple semesters.</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <CalendarClock className="w-8 h-8 text-orange-500 mb-3" />
                <h3 className="font-semibold text-slate-900">Exam Routines</h3>
                <p className="text-sm text-slate-500 mt-2">Access the latest exam routines and syllabus booklists.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Why Use Us</h2>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  Lightning fast performance
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  Mobile-friendly, responsive design
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  Clean, modern interface
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  No login required
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-amber-50 p-5 rounded-xl border border-amber-100">
            <h2 className="text-sm font-bold text-amber-800 mb-2 uppercase tracking-wider">Disclaimer</h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              This is an independent educational platform built to help students. It is <strong>NOT</strong> an official Bangladesh Technical Education Board (BTEB) website. Data is provided for informational purposes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
