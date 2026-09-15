import React, { useState } from 'react';
import { dbService } from '../lib/supabase';
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Server,
  Code2,
} from 'lucide-react';

interface AntiSleepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AntiSleepModal: React.FC<AntiSleepModalProps> = ({ isOpen, onClose }) => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    setIsTesting(true);
    try {
      const res = await dbService.pingDatabase();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Ping failed',
        latency_ms: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Supabase Free-Tier Anti-Sleep & Health Check
              </h3>
              <p className="text-xs text-slate-500">
                100% Free deployment architecture with keep-alive cron integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6 text-sm text-slate-700">
          {/* How it works banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs leading-relaxed space-y-2">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
              <Server className="w-4 h-4 text-emerald-700" />
              How the Anti-Sleep Keep-Alive Works
            </div>
            <p className="text-emerald-900">
              Supabase pauses free-tier projects after <strong>7 days of inactivity</strong>. To ensure 24/7 continuous operation with zero maintenance and $0 cost:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-emerald-800 font-medium">
              <li>
                This project includes a serverless function at <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-mono font-bold">/api/health</code>.
              </li>
              <li>
                When called, it executes a lightweight query against your Supabase tables to mark the project as active.
              </li>
              <li>
                You can link this URL to free cron services like <strong>cron-job.org</strong> or <strong>UptimeRobot</strong> to run every 3 to 5 days.
              </li>
            </ul>
          </div>

          {/* Test Ping Live */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Database Ping & Connection Test
              </div>
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isTesting ? 'Pinging...' : 'Test Connection Now'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <div>
                  <div className="font-bold">Status: {testResult.message}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Roundtrip Latency: {testResult.latency_ms} ms
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cron Job Setup Steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Setup in 2 Minutes on Cron-job.org (100% Free)
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>
                Deploy your project to Vercel (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">https://ayurvedic-unani-dehradun.vercel.app</code>).
              </li>
              <li>
                Create a free account on{' '}
                <a
                  href="https://cron-job.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-semibold"
                >
                  cron-job.org
                </a>.
              </li>
              <li>
                Click <strong>Create Cronjob</strong>, and enter URL:
                <div className="mt-1 flex items-center gap-2">
                  <code className="bg-slate-100 p-2 rounded-lg font-mono text-slate-900 font-bold block flex-1">
                    https://your-vercel-domain.vercel.app/api/health
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'https://your-vercel-domain.vercel.app/api/health',
                        'cron-url'
                      )
                    }
                    className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                  >
                    {copiedText === 'cron-url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </li>
              <li>
                Set Schedule to <strong>Every 3 Days</strong> (or Every 24 Hours).
              </li>
              <li>
                Save the cron job! Your Supabase database will stay permanently awake with zero monthly fees.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
