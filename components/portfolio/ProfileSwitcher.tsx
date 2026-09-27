'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { ChevronDown, Plus, Check } from 'lucide-react';
import CreateProfileModal from './CreateProfileModal';

export const RELATION_COLORS: Record<string, string> = {
    Self: 'bg-indigo-500',
    Father: 'bg-sky-500',
    Mother: 'bg-pink-500',
    Spouse: 'bg-amber-500',
    Child: 'bg-emerald-500',
    Other: 'bg-violet-500'
};

export default function ProfileSwitcher() {
    const { portfolios, activePortfolio, setActivePortfolio } = usePortfolio();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activePortfolio && (!portfolios || portfolios.length === 0)) {
        return (
            <div className="flex items-center">
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">
                    <Plus className="w-4 h-4 mr-1" /> Add Profile
                </button>
                <CreateProfileModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            </div>
        );
    }

    if (!activePortfolio) return <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg"></div>;

    const activeColor = RELATION_COLORS[activePortfolio.relation || 'Self'] || RELATION_COLORS.Other;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition min-w-[160px] justify-between cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${activeColor}`}></div>
                    <div className="flex flex-col items-start leading-none ml-1">
                        <span className="text-sm font-medium text-slate-800">{activePortfolio.memberName || 'Unnamed'}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide truncate mt-1">{activePortfolio.relation || 'Self'}</span>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Family Profiles
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                        {portfolios.map(portfolio => {
                            const isSelected = (activePortfolio.id || (activePortfolio as any)._id) === (portfolio.id || (portfolio as any)._id);
                            const pColor = RELATION_COLORS[portfolio.relation || 'Self'] || RELATION_COLORS.Other;
                            
                            return (
                                <button
                                    key={portfolio.id || (portfolio as any)._id}
                                    onClick={() => {
                                        setActivePortfolio(portfolio);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer ${isSelected ? 'bg-slate-50' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${pColor}`}></div>
                                        <div className="flex flex-col items-start">
                                            <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                {portfolio.memberName || 'Unnamed'}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{portfolio.relation || 'Self'}</span>
                                                {portfolio.isDefault && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">Default</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                        <button 
                            onClick={() => {
                                setIsOpen(false);
                                setIsCreateModalOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Add Family Member
                        </button>
                    </div>
                </div>
            )}
            
            <CreateProfileModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
}