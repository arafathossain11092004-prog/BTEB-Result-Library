import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              BTEB Result Library
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
              The fastest, most reliable way to check Bangladesh Technical Education Board (BTEB) Diploma results, calculate CGPA, and view exam routines.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/individual-results" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">Results</Link>
              </li>
              <li>
                <Link to="/calculator" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">CGPA Calculator</Link>
              </li>
              <li>
                <Link to="/routines" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">Exam Routines</Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">About Us</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/booklists" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">Booklists</Link>
              </li>
               <li>
                <Link to="/privacy-policy" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} BTEB Result Library. Not affiliated with BTEB.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>Developed with</span>
            <span className="text-red-500">❤</span>
            <span>by Arafat Hossain</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
