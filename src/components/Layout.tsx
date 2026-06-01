import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, LayoutDashboard, Search, FileText, Users, Building2, CalendarRange, Calculator, Menu, X, Lock, BookCopy } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import Footer from './Footer';

export default function Layout() {
  const { user, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes and scroll to top
  useEffect(() => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "BTEB Result Library",
        "url": "https://btebresultlibrary.vercel.app/",
        "description": "Fast BTEB result checking system for Bangladesh students.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://btebresultlibrary.vercel.app/individual-results?roll={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "EducationalOrganization",
        "name": "BTEB Result Library",
        "url": "https://btebresultlibrary.vercel.app/",
        "logo": "https://btebresultlibrary.vercel.app/favicon.svg",
        "sameAs": [],
        "description": "Independent educational platform providing easy access to Bangladesh Technical Education Board (BTEB) Diploma in Engineering results."
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>BTEB Result Library - Diploma Result in Bangladesh</title>
        <meta name="description" content="Check Bangladesh Technical Education Board (BTEB) Diploma in Engineering results easily. Calculate your CGPA or find your exam routine instantly." />
        <meta name="keywords" content="BTEB result, diploma result Bangladesh, CGPA calculator, BTEB diploma result, Polytechnic result, BTEB results 2024" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300 print:hidden",
        isScrolled ? "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm" : "bg-white border-b border-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xl">
                  B
                </div>
                <span className="font-bold text-xl text-blue-800 tracking-tight">
                  BTEB Result Library
                </span>
              </Link>
              <nav className="hidden lg:ml-8 lg:flex lg:space-x-4">
                <Link to="/individual-results" className="text-gray-600 hover:text-blue-700 inline-flex items-center px-2 pt-1 border-b-2 border-transparent hover:border-blue-600 text-sm font-medium transition-colors">
                  <Search className="w-4 h-4 mr-2" />
                  Individual Results
                </Link>
                <Link to="/group-results" className="text-gray-600 hover:text-blue-700 inline-flex items-center px-2 pt-1 border-b-2 border-transparent hover:border-blue-600 text-sm font-medium transition-colors">
                  <Users className="w-4 h-4 mr-2" />
                  Group Results
                </Link>
                <Link to="/calculator" className="text-gray-600 hover:text-blue-700 inline-flex items-center px-2 pt-1 border-b-2 border-transparent hover:border-blue-600 text-sm font-medium transition-colors">
                  <Calculator className="w-4 h-4 mr-2" />
                  CGPA Calculator
                </Link>
                <Link to="/exam-routines" className="text-gray-600 hover:text-blue-700 inline-flex items-center px-2 pt-1 border-b-2 border-transparent hover:border-blue-600 text-sm font-medium transition-colors">
                  <CalendarRange className="w-4 h-4 mr-2" />
                  Exam Routines
                </Link>
                <Link to="/booklists" className="text-gray-600 hover:text-blue-700 inline-flex items-center px-2 pt-1 border-b-2 border-transparent hover:border-blue-600 text-sm font-medium transition-colors">
                  <BookCopy className="w-4 h-4 mr-2" />
                  Booklists
                </Link>
              </nav>
            </div>
            
            <div className="hidden lg:flex items-center space-x-4">
              {!user && (
                 <Link to="/admin/login" className="inline-flex items-center text-sm font-medium border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                   <Lock className="w-4 h-4 mr-2" />
                   Admin Login
                 </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={cn(
                    "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Admin Panel
                </Link>
              )}
              {user && (
                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      window.location.href = '/admin/login';
                    } catch(e) {
                      console.error(e);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors bg-gray-100"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500 transition duration-150 ease-in-out"
                title="Open menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 overflow-hidden shadow-lg z-50"
            >
              <div className="px-4 pt-2 pb-4 space-y-1">
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/individual-results" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" /> Individual Results
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/group-results" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" /> Group Results
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/calculator" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-400" /> CGPA Calculator
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/exam-routines" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-gray-400" /> Exam Routines
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/booklists" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                  <BookCopy className="w-5 h-5 text-gray-400" /> Booklists
                </Link>
                
                <div className="border-t border-gray-100 my-2 pt-2">
                  {!user && (
                     <Link onClick={() => setIsMobileMenuOpen(false)} to="/admin/login" className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                       <Lock className="w-5 h-5 text-gray-400" /> Admin Login
                     </Link>
                  )}
                  {isAdmin && (
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/admin" className="text-blue-700 bg-blue-50 block px-3 py-2 rounded-md text-base font-bold flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5" /> Admin Panel
                    </Link>
                  )}
                  {user && (
                    <button onClick={async () => { 
                      try { 
                        await signOut(auth); 
                        setIsMobileMenuOpen(false); 
                        window.location.href = '/admin/login';
                      } catch(e) {
                        console.error(e);
                      }
                    }} className="w-full text-left text-red-600 hover:bg-red-50 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                      <LogOut className="w-5 h-5" /> Sign out
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:px-0 print:max-w-none w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="print:mt-0 print:pt-0"
        >
          <Outlet />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
