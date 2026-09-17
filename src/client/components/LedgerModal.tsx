import React, { useState, useEffect } from 'react';
import { Member, LoyaltyTransaction, ReconciliationData } from '../types';
import { getMemberTransactions, getMemberReconciliation } from '../api/client';
import { History, ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownLeft, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface LedgerModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({ member, isOpen, onClose }) => {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txList, recon] = await Promise.all([
        getMemberTransactions(member.id),
        getMemberReconciliation(member.id)
      ]);
      setTransactions(txList);
      setReconciliation(recon);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, member.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-black">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Immutable Points Ledger & Audit</h2>
              <p className="text-xs text-slate-400">
                Member: <strong className="text-slate-200">{member.name}</strong> ({member.formattedPhone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Reconciliation Status Banner */}
        {reconciliation && (
          <div className={`mx-5 mt-4 p-3.5 rounded-xl border flex items-center justify-between ${
            reconciliation.isConsistent
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {reconciliation.isConsistent ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <div>
                <span className="font-bold text-xs block">
                  {reconciliation.isConsistent ? '100% Exact Financial Integrity Verified' : 'Ledger Discrepancy Detected!'}
                </span>
                <span className="text-[11px] opacity-80">
                  Calculated from {reconciliation.totalTransactionsCount} immutable ledger entries • Discrepancy: {reconciliation.discrepancy} pts
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold block">Live Materialized Balance</span>
              <span className="text-sm font-extrabold font-mono">{reconciliation.materializedBalance.toLocaleString()} pts</span>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No transactions found for this member yet.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Points Delta</th>
                    <th className="py-2.5 px-3">Balance After</th>
                    <th className="py-2.5 px-3">Details / Reference</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.map((tx) => {
                    const isEarn = tx.points > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 font-sans text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isEarn
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isEarn ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={isEarn ? 'text-emerald-400' : 'text-amber-400'}>
                            {isEarn ? `+${tx.points}` : tx.points} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-200">
                          {tx.balanceAfter.toLocaleString()} pts
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans truncate max-w-[200px]">
                          {tx.metadata?.note || (tx.metadata?.orderId ? `Order #${tx.metadata.orderId.slice(0, 8)}` : 'POS Transaction')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 font-sans">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/40">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
