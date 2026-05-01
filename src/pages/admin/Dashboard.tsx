import { Link } from 'react-router-dom';
import { Users, FileText, CalendarRange, Award, ShieldCheck, Settings, BookCopy } from 'lucide-react';

export default function AdminDashboard() {
  const cards = [
    {
      title: 'Manage Results',
      description: 'Upload, edit, or delete student results.',
      icon: Award,
      to: '/admin/results',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Exam Routines',
      description: 'Update exam routines by semester and subject.',
      icon: CalendarRange,
      to: '/admin/schedules',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Booklists',
      description: 'Manage semester subject lists and book codes.',
      icon: BookCopy,
      to: '/admin/booklists',
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
    {
      title: 'System Settings',
      description: 'Configure banner images and application preferences.',
      icon: Settings,
      to: '/admin/settings',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome to the BTEB Result Library admin control panel.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h2>
            <p className="text-sm text-gray-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
