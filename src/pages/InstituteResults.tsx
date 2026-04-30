import { motion } from "motion/react";

export default function InstituteResults() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="p-4 sm:p-8 w-full max-w-7xl mx-auto min-h-[calc(100vh-64px)]"
    >
      <div className="w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden min-h-[800px] flex flex-col">
        <iframe 
          src="/institute-results" 
          className="w-full flex-1 border-0"
          title="Institute Results"
        />
      </div>
    </motion.div>
  );
}
