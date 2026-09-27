'use client';

import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PortfolioContext } from '@/context/PortfolioContext';
import { recordTransaction as addTransaction } from '@/lib/actions/transaction-actions';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransactionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  holding?: any;
  onSuccess?: () => void;
}

export default function TransactionModal({ isOpen: controlledIsOpen, onClose: controlledOnClose, holding, onSuccess }: TransactionModalProps) {
    const { activePortfolio } = useContext(PortfolioContext);
    const [internalOpen, setInternalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isControlled = controlledIsOpen !== undefined;
    const isModalVisible = isControlled ? controlledIsOpen : internalOpen;
    const closeModal = () => {
        if (isControlled && controlledOnClose) controlledOnClose();
        else setInternalOpen(false);
    };
    
    // State form
    const [type, setType] = useState('BUY');
    const [holdingId, setHoldingId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [units, setUnits] = useState('');
    const [nav, setNav] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (holding) {
            setNav(holding.currentNav || '');
            setHoldingId(holding.id || holding._id || '');
        }
    }, [holding]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const amount = (parseFloat(units) * parseFloat(nav)).toFixed(2);
            await addTransaction({
                holdingId: holdingId || holding?.id || 'default-holding',
                portfolioId: holding?.portfolioId || activePortfolio?.id || 'default-portfolio',
                type,
                units: units,
                nav: nav,
                amount: amount,
                date: new Date(date),
                notes: notes,
            });
            if (onSuccess) onSuccess();
            closeModal();
            setUnits('');
            setNotes('');
        } catch (error: any) {
            console.error("Failed to save tx", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!isControlled && (
                <Button onClick={() => setInternalOpen(true)} className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5 shadow-sm">
                    <Plus className="w-4 h-4" /> Record Transaction
                </Button>
            )}

            {isModalVisible && mounted && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Record Transaction</h2>
                                <p className="text-xs text-slate-500">
                                    {holding?.name ? `For ${holding.name}` : 'Post an investment order or SIP'}
                                </p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
                                <select 
                                    value={type} 
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                                >
                                    <option value="BUY">BUY (Lump sum purchase)</option>
                                    <option value="SIP">SIP (Automated purchase)</option>
                                    <option value="SELL">SELL (Redemption)</option>
                                    <option value="DIVIDEND">DIVIDEND (Reinvestment / Payout)</option>
                                    <option value="INTEREST">INTEREST</option>
                                    <option value="SWITCH_IN">SWITCH IN</option>
                                    <option value="SWITCH_OUT">SWITCH OUT</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Date</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Units</label>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        placeholder="0.00"
                                        value={units} 
                                        onChange={(e) => setUnits(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">NAV / Price (₹)</label>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        placeholder="0.00"
                                        value={nav} 
                                        onChange={(e) => setNav(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {units && nav && (
                                <div className="p-3 bg-violet-50 rounded-lg text-xs flex justify-between items-center text-violet-900 border border-violet-100">
                                    <span>Calculated Total Amount:</span>
                                    <span className="font-bold text-sm">
                                        ₹{(parseFloat(units) * parseFloat(nav)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Regular monthly SIP order"
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                />
                            </div>

                            <div className="pt-3 flex gap-3">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white">
                                    {loading ? 'Saving...' : 'Save Transaction'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}