'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon, 
  ArrowDownTrayIcon, 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('integration'); 

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/logs');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs
      .filter((l) => {
        if (!l) return false;
        const hay = `${l.action} ${JSON.stringify(l.details || {})}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logs, search]);

  const getStatusColor = (action) => {
    if (action.includes('error') || action.includes('fail')) return 'text-red-600 bg-red-50';
    return 'text-gray-600';
  };

  const getSummary = (log) => {
    const d = log.details || {};
    if (log.action === 'order_updated') return `Order ${d.orderId || ''} updated`;
    if (log.action === 'subscription_updated') return `Subscription ${d.wcSubId || ''} changed`;
    if (log.action === 'renewal_order_updated') return `Renewal processed`;
    return log.action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-sm">
      <header className="bg-slate-900 text-white h-14 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="font-bold text-xl tracking-tight bg-green-500 text-black px-1 rounded">H</div>
          <nav className="flex gap-6 text-gray-300">
            <a href="#" className="hover:text-white">Jobs</a>
            <a href="#" className="hover:text-white">Candidates</a>
            <a href="#" className="hover:text-white">Tests</a>
            <a href="#" className="hover:text-white">Interviews</a>
            <a href="#" className="hover:text-white">More ⌄</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-slate-800 border-none rounded text-white pl-9 py-1.5 focus:ring-1 focus:ring-gray-500 w-64 text-sm"
            />
          </div>
          <div className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">RB</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto py-8 px-6">
          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Personal</h3>
            <ul className="space-y-3 text-gray-600">
              <li><a href="#" className="hover:text-gray-900 block">Report Settings</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Email Notifications</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Profile</a></li>
              <li><a href="#" className="hover:text-gray-900 block">My API Token</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Invite settings</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Advanced settings</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3 text-gray-600">
              <li><a href="#" className="hover:text-gray-900 block">Company settings</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Test Settings</a></li>
              <li><a href="#" className="hover:text-gray-900 block">CodePair Settings</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Compliance & Security</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Single Sign On</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Integrations</a></li>
              <li><a href="#" className="hover:text-gray-900 block">Diversity & Inclusion</a></li>
              <li className="relative">
                <div className="absolute -left-6 top-0 bottom-0 w-1 bg-green-500 rounded-r"></div>
                <a href="#" className="text-gray-900 font-medium block">Logs</a>
              </li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 relative">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Logs</h1>

          <div className="flex items-center gap-2 mb-6">
            <button 
              onClick={() => setActiveTab('integration')}
              className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'integration' ? 'bg-black text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
            >
              Integration logs
            </button>
            <button 
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'audit' ? 'bg-black text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
            >
              Audit logs
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded pl-4 pr-10 py-2 text-gray-700 focus:outline-none focus:border-gray-400 w-40">
                  <option>Calendly</option>
                  <option>All Sources</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text" 
                  placeholder="Search by requester email" 
                  className="w-full bg-white border border-gray-300 rounded pl-10 pr-4 py-2 text-gray-700 focus:outline-none focus:border-gray-400"
                />
              </div>

              <button className="p-2 border border-gray-300 rounded bg-white text-gray-500 hover:bg-gray-50">
                <FunnelIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => window.location.reload()} className="p-2 border border-gray-300 rounded bg-white text-gray-500 hover:bg-gray-50">
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button className="p-2 border border-gray-300 rounded bg-white text-gray-500 hover:bg-gray-50">
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold text-gray-900 w-48">Timestamp</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 w-24">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Requester Email</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${getStatusColor(log.action)}`}>
                        {log.action.includes('error') ? 'Error' : 'Success'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {log.details?.email || 'user@example.com'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {getSummary(log)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                      No logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6">
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-500">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-slate-800 text-white rounded font-medium">1</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700">2</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700">3</button>
            <span className="text-gray-400">...</span>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-700">24</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-gray-500">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {selectedLog && (
            <div className="absolute top-32 right-8 w-[450px] bg-white rounded-lg shadow-2xl border border-gray-200 z-10 animate-fade-in-up">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Details</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Field</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Current value</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Status code</span>
                    <span className="text-gray-900">{selectedLog.action.includes('error') ? '404' : '200'}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Requester Email</span>
                    <span className="text-gray-900">{selectedLog.details?.email || 'nice.name@gmail.com'}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 w-1/3">Problem in Detail</span>
                    <span className="text-gray-900 w-2/3 text-right">
                      {JSON.stringify(selectedLog.details || {})}
                    </span>
                  </div>

                   <div className="flex justify-between py-2">
                    <span className="text-gray-600">company_id</span>
                    <span className="text-gray-900">HackerRank Max</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Country</span>
                    <span className="text-gray-900">Worldwide</span>
                  </div>

                   <div className="flex justify-between py-2">
                    <span className="text-gray-600">timezone</span>
                    <span className="text-gray-900">(GMT-8)</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}