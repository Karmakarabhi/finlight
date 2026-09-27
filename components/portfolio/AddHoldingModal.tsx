'use client';
import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PortfolioContext } from '@/context/PortfolioContext';
import { addHolding } from '@/lib/actions/holding-actions';
import FundSearchInput from './FundSearchInput';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddHoldingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddHoldingModal({ isOpen: controlledIsOpen, onClose: controlledOnClose, onSuccess }: AddHoldingModalProps) {
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
    
    const [type, setType] = useState('MF');
    const [name, setName] = useState('');
    const [amfiCode, setAmfiCode] = useState('');
    const [symbol, setSymbol] = useState('');
    const [units, setUnits] = useState('');
    const [avgCost, setAvgCost] = useState('');
    const [category, setCategory] = useState('Equity');
    const [capType, setCapType] = useState('None');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addHolding({
                portfolioId: activePortfolio?.id || 'default-portfolio',
                type,
                name,
                amfiCode: type === 'MF' ? amfiCode : undefined,
                symbol: type === 'ETF' || type === 'Stock' ? symbol : undefined,
                units: units || '0',
                avgCost: avgCost || '0',
                category,
                capType: type === 'MF' || type === 'Stock' || type === 'ETF' ? capType : 'None'
            });
            if (onSuccess) onSuccess();
            closeModal();
            setName('');
            setUnits('');
            setAvgCost('');
        } catch (error: any) {
            console.error("Failed to add holding", error);
        } finally {
             setLoading(false);
        }
    };

    const handleFundSelect = (scheme: any) => {
        setName(scheme.name);
        setAmfiCode(scheme.amfiCode);
    };

    return (
        <>
            {!isControlled && (
                <Button onClick={() => setInternalOpen(true)} className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Holding
                </Button>
            )}

            {isModalVisible && mounted && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-200">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Add Investment Holding</h2>
                                <p className="text-xs text-slate-500">Record a new asset in your portfolio</p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Instrument Type</label>
                                <select 
                                    value={type} 
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                                >
                                    <option value="MF">Mutual Fund</option>
                                    <option value="ETF">ETF</option>
                                    <option value="Stock">Stock / Equity</option>
                                    <option value="FD">Fixed Deposit</option>
                                    <option value="Savings">Savings Account</option>
                                    <option value="PPF">PPF</option>
                                </select>
                            </div>

                            {type === 'MF' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Search AMFI Mutual Fund</label>
                                    <FundSearchInput onSelect={handleFundSelect} />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Parag Parikh Flexi Cap Fund"
                                    required
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Units</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={units}
                                        onChange={(e) => setUnits(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Buy NAV / Cost (₹)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={avgCost}
                                        onChange={(e) => setAvgCost(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                                    <select 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none"
                                    >
                                        <option value="Equity">Equity</option>
                                        <option value="Debt">Debt</option>
                                        <option value="Liquid">Liquid</option>
                                        <option value="Gold">Gold</option>
                                        <option value="FD">Fixed Deposit</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cap Type</label>
                                    <select 
                                        value={capType} 
                                        onChange={(e) => setCapType(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none"
                                    >
                                        <option value="None">None</option>
                                        <option value="Large">Large Cap</option>
                                        <option value="Mid">Mid Cap</option>
                                        <option value="Small">Small Cap</option>
                                        <option value="Multi">Multi Cap</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex gap-3">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white">
                                    {loading ? 'Saving...' : 'Add Holding'}
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