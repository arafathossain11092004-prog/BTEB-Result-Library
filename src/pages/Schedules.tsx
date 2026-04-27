import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, Bell, FileText, Download, CalendarRange } from 'lucide-react';
import { motion } from 'motion/react';

export default function Schedules({ type }: { type: 'routine' | 'notice' }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const collectionName = type === 'routine' ? 'examRoutines' : 'notices';
        const q = query(collection(db, collectionName), limit(50));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as any));
        
        if (type === 'routine') {
          docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
          docs.sort((a, b) => b.createdAt - a.createdAt);
        }
        setData(docs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

  const renderRoutine = (routine: any, i: number) => (
    <motion.div 
      key={routine.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-4"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div>
         <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{routine.semester} Semester</span>
            {routine.department && <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{routine.department}</span>}
            <span className="text-sm font-semibold text-gray-500">{routine.date} • {routine.time}</span>
         </div>
         <h3 className="text-lg font-bold text-gray-900 leading-snug">{routine.subjectName}</h3>
         <p className="text-sm text-gray-500 mt-1">Subject Code: {routine.subjectCode}</p>
      </div>
      <div className="hidden sm:flex flex-col items-center justify-center min-w-[70px] bg-blue-50 rounded-xl py-3 px-2 text-blue-700">
         <CalendarRange className="w-5 h-5 mb-1 opacity-70" />
      </div>
    </motion.div>
  );

  const renderNotice = (notice: any, i: number) => (
    <motion.div 
      key={notice.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-start gap-4"
    >
      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
         <FileText className="w-6 h-6" />
      </div>
      <div className="flex-1">
         <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1">{notice.title}</h3>
         <p className="text-xs text-gray-500 font-medium mb-3">Published: {new Date(notice.createdAt).toLocaleDateString()}</p>
         <a 
           href={notice.pdfUrl} 
           target="_blank" 
           rel="noopener noreferrer"
           className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
         >
            <Download className="w-4 h-4 mr-2" /> View PDF
         </a>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-0">
      <div className="mb-8 pl-1">
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          {type === 'routine' ? 'Exam Routines' : 'Notice Board'}
        </h1>
        <p className="text-gray-500">
          {type === 'routine' ? 'Check the latest exam dates and times.' : 'Important updates and PDF notices.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-2xl border border-gray-100 flex gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {type === 'routine' ? 'routines' : 'notices'} found.</p>
        </div>
      ) : (
        <div className={type === 'notice' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
          {data.map((item, i) => type === 'routine' ? renderRoutine(item, i) : renderNotice(item, i))}
        </div>
      )}
    </div>
  );
}
