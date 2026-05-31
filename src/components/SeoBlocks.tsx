import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, TrendingUp, Search, Info, Link as LinkIcon, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

interface FaqItem {
  q: string;
  a: string;
}

interface SeoBlocksProps {
  pageTitle: string;
  metaDescription: string;
  aboutTitle: string;
  aboutContent: React.ReactNode;
  howItWorksSteps: { title: string; desc: string }[];
  faqs: FaqItem[];
  keywordBoostText: string;
}

const SeoBlocks = memo(({ 
  pageTitle,
  metaDescription,
  aboutTitle, 
  aboutContent, 
  howItWorksSteps, 
  faqs, 
  keywordBoostText 
}: SeoBlocksProps) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Generate FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="w-full bg-slate-50 mt-16 py-12 px-4 sm:px-8 xl:px-12 rounded-3xl border border-slate-200 shadow-sm relative z-20 print:hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
      
      <div className="w-full max-w-7xl mx-auto space-y-16">
        
        {/* 1. Trending Notice Section */}
        <section className="bg-white rounded-2xl p-6 md:p-8 flex items-start gap-4 shadow-sm border border-orange-100">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Trending in Bangladesh Right Now</h2>
            <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-0">
              <li>Diploma Result search is increasing rapidly across Bangladesh.</li>
              <li>Students are actively checking their latest BTEB semester results.</li>
              <li>Instant, reliable result checking tools are currently in high demand.</li>
            </ul>
          </div>
        </section>

        {/* 2. SEO Content Expansion Section */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">{aboutTitle}</h2>
          </div>
          <div className="prose prose-slate max-w-none text-slate-600">
            {aboutContent}
          </div>
        </section>

        {/* 3. How It Works Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {howItWorksSteps.map((step, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-lg mx-auto mb-4 border border-blue-200">
                  {idx + 1}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Related Pages Section */}
        <section className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <LinkIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold">Related Academic Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: "/individual-results", label: "Individual Results", desc: "Check semester GPA" },
              { to: "/group-results", label: "Group Results", desc: "Institute-wise PDF" },
              { to: "/calculator", label: "CGPA Calculator", desc: "Calculate accurate CGPA" },
              { to: "/exam-routines", label: "Exam Routines", desc: "Download PDF schedule" },
              { to: "/booklists", label: "Booklists / Syllabus", desc: "2022 regulation books" }
            ].map((link, idx) => (
              <Link 
                key={idx} 
                to={link.to}
                className="bg-slate-800 p-5 rounded-2xl hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-600 group"
              >
                <div className="font-bold text-blue-300 group-hover:text-blue-200 mb-1">{link.label}</div>
                <div className="text-sm text-slate-400">{link.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. FAQ Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 justify-center">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 text-center">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 font-semibold text-slate-900 text-left"
                >
                  {faq.q}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-50 mt-1">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Keyword Boost Block (Hidden SEO Safe Text) */}
        <section className="text-xs text-slate-400/80 max-w-4xl mx-auto text-center leading-relaxed">
          <p>{keywordBoostText}</p>
        </section>

      </div>
    </div>
  );
});

export default SeoBlocks;
