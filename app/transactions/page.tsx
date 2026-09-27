import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import TransactionModal from '@/components/portfolio/TransactionModal';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const sampleTransactions = [
  {
    id: "tx-1",
    date: "2026-09-15",
    type: "SIP",
    fundName: "Parag Parikh Flexi Cap Fund",
    units: "65.06",
    nav: "76.85",
    amount: "5,000",
    notes: "Monthly automated SIP"
  },
  {
    id: "tx-2",
    date: "2026-09-10",
    type: "BUY",
    fundName: "Mirae Asset Large Cap Fund",
    units: "95.88",
    nav: "104.30",
    amount: "10,000",
    notes: "Lump sum allocation"
  },
  {
    id: "tx-3",
    date: "2026-08-20",
    type: "SIP",
    fundName: "HDFC Short Term Debt Fund",
    units: "177.62",
    nav: "28.15",
    amount: "5,000",
    notes: "Debt stabilization SIP"
  }
];

export default function TransactionsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <AppHeader />
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <PageHeader
              title="Investment Ledger & Transactions"
              description="Complete chronological transaction statement with auto-recalculated weighted average buy cost"
            />
            <TransactionModal />
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="text-base font-semibold text-slate-800">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Fund / Asset</th>
                    <th className="px-6 py-3 text-right">Units</th>
                    <th className="px-6 py-3 text-right">NAV (₹)</th>
                    <th className="px-6 py-3 text-right">Amount (₹)</th>
                    <th className="px-6 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sampleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{tx.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tx.type === 'SELL' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {tx.type === 'SELL' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{tx.fundName}</td>
                      <td className="px-6 py-4 text-right text-slate-600">{tx.units}</td>
                      <td className="px-6 py-4 text-right text-slate-600">₹{tx.nav}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">₹{tx.amount}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{tx.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
