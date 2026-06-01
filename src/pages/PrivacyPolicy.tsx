import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Lock, FileText, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy - BTEB Result Library",
    "description": "Privacy Policy for BTEB Result Library. Learn how we handle your data, search queries, and ensure a secure experience while checking diploma results.",
    "url": "https://btebresultlibrary.vercel.app/privacy-policy",
    "publisher": {
      "@type": "Organization",
      "name": "BTEB Result Library",
      "logo": {
        "@type": "ImageObject",
        "url": "https://btebresultlibrary.vercel.app/favicon.svg"
      }
    }
  };

  return (
    <div className="w-full font-sans px-4 sm:px-6 py-12">
      <Helmet>
        <title>Privacy Policy | BTEB Result Library</title>
        <meta name="description" content="Privacy Policy for BTEB Result Library. We are committed to protecting your privacy while you check Bangladesh Technical Education Board (BTEB) Diploma results." />
        <meta name="keywords" content="BTEB Result Privacy Policy, Diploma Result BD privacy, CGPA Calculator Bangladesh privacy, BTEB result data security" />
        <link rel="canonical" href="https://btebresultlibrary.vercel.app/privacy-policy" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
        <div className="bg-white/80 border-b border-slate-100 px-8 py-8 sm:py-10 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-slate-500 text-lg">Effective Date: May {new Date().getFullYear()}</p>
          </div>
        </div>
        
        <div className="p-8 sm:p-10 space-y-10">
          <section className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed text-lg mb-8">
              Welcome to <strong>BTEB Result Library</strong> ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive, secure experience while checking your Bangladesh Technical Education Board (BTEB) Diploma results, exam routines, and using our CGPA calculators.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <FileText className="w-6 h-6 text-indigo-500 mb-3" />
                <h2 className="text-xl font-semibold text-slate-800 mt-0 mb-3">1. Information We Collect</h2>
                <p className="text-slate-600 leading-relaxed m-0 text-sm">
                  We collect minimal data to provide our services. When you use our website, we may collect non-personally identifiable information such as browser type, device information, and search queries (like roll numbers) purely to fetch and display the requested results from our database. We do not require account creation or personal profile data.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <Globe className="w-6 h-6 text-emerald-500 mb-3" />
                <h2 className="text-xl font-semibold text-slate-800 mt-0 mb-3">2. How We Use Data</h2>
                <p className="text-slate-600 leading-relaxed m-0 text-sm">
                  The data we collect is used solely to operate, maintain, and improve the performance and user experience of BTEB Result Library. We analyze general traffic patterns to ensure fast page load times and mobile responsiveness. Your search queries are only used instantaneously to retrieve your academic results.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">3. Cookies Policy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              We may use cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies, however, this may limit some functionalities of the site.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 flex items-center gap-3 border-b border-slate-100 pb-2">
              <Lock className="w-6 h-6 text-indigo-500" />
              4. Data Security
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              The security of your data is important to us. We serve all pages over secure HTTPS connections. Because we do not ask for or store sensitive personal information (such as passwords, financial data, or national IDs), the risk associated with data breaches is minimal. However, remember that no method of transmission over the Internet is 100% secure.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">5. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              We may employ third-party companies and individuals to facilitate our service, provide the service on our behalf, perform site-related services (like Vercel for hosting), or assist us in analyzing how our service is used (like Google Analytics). These third parties have access to your non-personal data only to perform these tasks on our behalf.
            </p>

            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 my-8">
              <h2 className="text-xl font-semibold text-amber-800 mt-0 mb-3">6. Official Result Disclaimer</h2>
              <p className="text-amber-700 leading-relaxed m-0">
                <strong>BTEB Result Library is an independent platform.</strong> We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with the Bangladesh Technical Education Board (BTEB) or any government agency. The results provided here are for immediate informational purposes based on publicly available records. For official verifications, please consult official BTEB documentation.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">7. Children's Privacy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your Children has provided us with Personal Data, please contact us.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">8. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">9. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
              <br />
              <strong>Email:</strong> support@btebresultlibrary.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
