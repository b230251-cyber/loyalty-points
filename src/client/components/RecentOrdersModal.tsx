import React, { useState, useEffect } from 'react';
import { fetchRecentOrders } from '../api/client';
import { Clock, X, ShoppingBag, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';

interface RecentOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecentOrdersModal: React.FC<RecentOrdersModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchRecentOrders(30);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-black relative">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recent POS Counter Orders</h2>
              <p className="text-xs text-slate-400">Live order logs and loyalty points recorded</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No orders recorded yet. Complete an order at the counter!
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 text-slate-400 font-sans font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Net Paid</th>
                    <th className="py-2.5 px-3">Points Earned</th>
                    <th className="py-2.5 px-3">Points Redeemed</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-300 font-bold">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">
                        {o.memberName ? (
                          <span>{o.memberName}</span>
                        ) : (
                          <span className="text-slate-500 italic">Guest Checkout</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">
                        ${o.netPaidAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        {o.pointsEarned > 0 ? (
                          <span className="text-emerald-400 font-bold">+{o.pointsEarned} pts</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {o.pointsRedeemed > 0 ? (
                          <span className="text-amber-400 font-bold">-{o.pointsRedeemed} pts</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-sans">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/40">
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Orders</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
