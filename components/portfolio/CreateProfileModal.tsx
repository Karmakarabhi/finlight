'use client';

import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PortfolioContext } from '@/context/PortfolioContext';
import { X, Check, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PRESET_COLORS = ['#6366f1', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
const RELATIONS = ['Self', 'Father', 'Mother', 'Spouse', 'Child', 'Other'];

export default function CreateProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { createPortfolio, setActivePortfolio } = useContext(PortfolioContext);
    const [mounted, setMounted] = useState(false);
    
    const [memberName, setMemberName] = useState('');
    const [relation, setRelation] = useState('Self');
    const [name, setName] = useState('');
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [isDefault, setIsDefault] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!memberName.trim()) {
            setError('Member Name is required.');
            return;
        }

        const fallbackName = name.trim() ? name : `${memberName.trim()}'s Portfolio`;
        
        setLoading(true);
        try {
            const newPortfolio = await createPortfolio({ 
                name: fallbackName, 
                memberName: memberName.trim(), 
                relation, 
                color, 
                isDefault,
                currency: 'INR'
            });
            
            toast.success(`${memberName.trim()}'s profile created!`);
            if (newPortfolio) {
                setActivePortfolio(newPortfolio);
            }
            onClose();
            
            // Reset state
            setMemberName('');
            setRelation('Self');
            setName('');
            setColor(PRESET_COLORS[0]);
            setIsDefault(false);
        } catch (err: any) {
            console.error("Failed to create portfolio", err);
            setError(err?.message || 'Failed to create profile. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Add Family Member</h2>
                            <p className="text-xs text-slate-500">Create a distinct portfolio for your family member</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition cursor-pointer"
                        aria-label="Close dialog"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-200">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Family Member Name <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            value={memberName} 
                            onChange={(e) => setMemberName(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                            placeholder="e.g., Priya"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Relation</label>
                            <select 
                                value={relation} 
                                onChange={(e) => setRelation(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
                            >
                                {RELATIONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Portfolio Title (Optional)</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                placeholder="e.g., Retirement"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Color Theme</label>
                        <div className="flex items-center gap-3">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm cursor-pointer ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : ''}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center pt-2">
                        <input 
                            type="checkbox" 
                            id="isDefault" 
                            checked={isDefault} 
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <label htmlFor="isDefault" className="ml-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                            Set as my default dashboard view
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer" 
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm cursor-pointer disabled:opacity-50" 
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}