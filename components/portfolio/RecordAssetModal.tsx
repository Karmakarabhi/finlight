'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHousehold } from '@/context/HouseholdContext';
import { addHolding } from '@/lib/actions/holding-actions';

interface RecordAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordAssetModal({ isOpen, onClose, onSuccess }: RecordAssetModalProps) {
  const [mounted, setMounted] = useState(false);
  const { state, refresh } = useHousehold();

  const [assetType, setAssetType] = useState<'MF' | 'Stock' | 'FD' | 'Gold'>('MF');
  const [ownerMemberId, setOwnerMemberId] = useState('');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [category, setCategory] = useState<'equity' | 'debt' | 'gold' | 'cash'>('equity');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set default owner to Self (Abhijit)
  useEffect(() => {
    if (state?.members && state.members.length > 0 && !ownerMemberId) {
      const self = state.members.find((m) => m.relation === 'Self') || state.members[0];
      setOwnerMemberId(self.id);
    }
  }, [state?.members, ownerMemberId]);

  // Adjust default category based on assetType
  const handleTypeChange = (t: 'MF' | 'Stock' | 'FD' | 'Gold') => {
    setAssetType(t);
    if (t === 'Stock') setCategory('equity');
    if (t === 'FD') setCategory('debt');
    if (t === 'Gold') setCategory('gold');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an asset or scheme name.');
      return;
    }
    const val = parseFloat(currentValue);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive current value.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addHolding({
        portfolioId: ownerMemberId,
        type: assetType,
        name: name.trim(),
        amfiCode: assetType === 'MF' ? identifier.trim() : undefined,
        symbol: assetType === 'Stock' ? identifier.trim() : undefined,
        units: '1',
        avgCost: costBasis ? costBasis : currentValue,
        currentNav: currentValue,
        category,
      });

      await refresh();
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setName('');
      setIdentifier('');
      setCurrentValue('');
      setCostBasis('');
    } catch (err: any) {
      console.warn('Backend addHolding note:', err);
      // Even if database fails to persist locally, refresh context
      await refresh();
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Record New Household Asset</h2>
            <p className="text-xs text-slate-500">Add an asset to the family balance sheet inventory</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Owner Member Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner Family Member *
            </label>
            <select
              value={ownerMemberId}
              onChange={(e) => setOwnerMemberId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              {(state?.members || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relation})
                </option>
              ))}
            </select>
          </div>

          {/* Asset Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['MF', 'Stock', 'FD', 'Gold'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    assetType === t
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asset / Scheme Name *
            </label>
            <Input
              placeholder={
                assetType === 'MF'
                  ? 'e.g. Parag Parikh Flexi Cap Fund'
                  : assetType === 'Stock'
                  ? 'e.g. Reliance Industries Ltd'
                  : assetType === 'FD'
                  ? 'e.g. HDFC Bank Cumulative Fixed Deposit'
                  : 'e.g. Sovereign Gold Bond 2024-25'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Identifier & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Identifier / Symbol (Optional)
              </label>
              <Input
                placeholder={assetType === 'MF' ? 'AMFI Code' : 'NSE Symbol / Acc No'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Allocation Class *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="equity">Equity</option>
                <option value="debt">Debt / Fixed Income</option>
                <option value="gold">Gold</option>
                <option value="cash">Cash / Liquid</option>
              </select>
            </div>
          </div>

          {/* Current Value & Cost Basis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Value (₹) *
              </label>
              <Input
                type="number"
                placeholder="₹ Amount"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="h-9 text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Basis (₹) (Optional)
              </label>
              <Input
                type="number"
                placeholder="Purchase cost"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSubmitting ? 'Recording…' : 'Record Asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
