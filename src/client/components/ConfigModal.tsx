import React, { useState } from 'react';
import { ProgramConfig, TierConfig } from '../types';
import { updateConfig } from '../api/client';
import { Settings, Award, DollarSign, Check, X, AlertCircle } from 'lucide-react';

interface ConfigModalProps {
  config: ProgramConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: (newConfig: ProgramConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  config,
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [pointsPerDollar, setPointsPerDollar] = useState(config.pointsPerDollar);
  const [roundingStrategy, setRoundingStrategy] = useState(config.roundingStrategy);
  const [tiers, setTiers] = useState<TierConfig[]>(JSON.parse(JSON.stringify(config.tiers)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTierChange = (index: number, field: keyof TierConfig, value: any) => {
    const nextTiers = [...tiers];
    nextTiers[index] = { ...nextTiers[index], [field]: value };
    setTiers(nextTiers);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateConfig({
        pointsPerDollar: Number(pointsPerDollar),
        roundingStrategy,
        tiers
      });
      onConfigUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update config');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black relative">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Loyalty Rules & Tier Configuration</h2>
              <p className="text-xs text-slate-400">Configure earn rates, tier multipliers, and progression rules</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Base Earn Rate */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Base Points Earning Rate
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Points per $1 Spent
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={pointsPerDollar}
                  onChange={(e) => setPointsPerDollar(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fractional Points Rounding
                </label>
                <select
                  value={roundingStrategy}
                  onChange={(e) => setRoundingStrategy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="floor">Floor (Standard / Conservative)</option>
                  <option value="round">Round (Nearest integer)</option>
                  <option value="ceil">Ceil (Generous)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tier Definitions & Multipliers */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Tiers & Multipliers
            </h3>

            <div className="space-y-3">
              {tiers.map((t, idx) => (
                <div key={t.tier} className="p-3 bg-slate-850 rounded-xl border border-slate-750 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                  <div className="w-28">
                    <span className="font-extrabold text-xs block text-white">{t.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{t.tier}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Min Lifetime Points</label>
                      <input
                        type="number"
                        disabled={t.tier === 'BRONZE'}
                        min="0"
                        value={t.minPoints}
                        onChange={(e) => handleTierChange(idx, 'minPoints', parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Earn Multiplier (x)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.05"
                        value={t.multiplier}
                        onChange={(e) => handleTierChange(idx, 'multiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
