import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { ActivityLog } from '../../types';
import {
  Clock,
  Search,
  Filter,
  Pill,
  FileText,
  FileCode,
  ShieldCheck,
  User,
  History,
  Calendar,
} from 'lucide-react';

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const list = await dbService.getActivityLogs();
    setLogs(list);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCat = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryIcon = (cat: ActivityLog['category']) => {
    switch (cat) {
      case 'medicine':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'mpr':
        return <FileText className="w-4 h-4 text-teal-600" />;
      case 'form':
        return <FileCode className="w-4 h-4 text-indigo-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            System Audit Trail
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Activity & Submission Audit Logs
          </h2>
          <p className="text-sm text-slate-600">
            Chronological records tracking catalog updates, form publications, and hospital submission timestamps.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, user, or hospital..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['all', 'medicine', 'mpr', 'form', 'admin'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No activity logs match the selected filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                {getCategoryIcon(log.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-slate-900">{log.action}</h4>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-1">{log.details}</p>

                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-slate-700">{log.user}</span>
                  <span>•</span>
                  <span className="capitalize px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">
                    {log.category}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
