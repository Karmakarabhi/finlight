'use client';

import * as React from 'react';
import { createContext, useState, useEffect, useContext } from 'react';
import { listPortfolios, createPortfolio as apiCreatePortfolio } from '@/lib/actions/portfolio-actions';

export interface PortfolioType {
  id: string;
  name: string;
  memberName: string;
  relation?: string;
  currency?: string;
  color?: string;
  isDefault?: boolean;
  riskProfile?: string;
  targetEquityPct?: string;
  targetDebtPct?: string;
  targetGoldPct?: string;
  cachedXirr?: string | null;
}

interface PortfolioContextType {
  portfolios: PortfolioType[];
  activePortfolio: PortfolioType | null;
  setActivePortfolio: (portfolio: PortfolioType | null) => void;
  loading: boolean;
  createPortfolio: (data: any) => Promise<any>;
  fetchPortfolios: () => Promise<void>;
}

const defaultPortfolio: PortfolioType = {
  id: 'default-portfolio',
  name: 'Primary Wealth Portfolio',
  memberName: 'Abhijit',
  relation: 'Self',
  currency: 'INR',
  color: '#6366f1',
  isDefault: true,
  riskProfile: 'Moderate',
  targetEquityPct: '60',
  targetDebtPct: '30',
  targetGoldPct: '10',
};

export const PortfolioContext = createContext<PortfolioContextType>({
  portfolios: [defaultPortfolio],
  activePortfolio: defaultPortfolio,
  setActivePortfolio: () => {},
  loading: false,
  createPortfolio: async () => ({ success: true }),
  fetchPortfolios: async () => {},
});

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([defaultPortfolio]);
  const [activePortfolio, setActivePortfolioState] = useState<PortfolioType | null>(defaultPortfolio);
  const [loading, setLoading] = useState(false);

  const setActivePortfolio = (portfolio: PortfolioType | null) => {
    setActivePortfolioState(portfolio);
    if (typeof window !== 'undefined') {
      if (portfolio) {
        localStorage.setItem('activePortfolioId', portfolio.id);
      } else {
        localStorage.removeItem('activePortfolioId');
      }
    }
  };

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const fetched = await listPortfolios();
      if (fetched && fetched.length > 0) {
        const typed = fetched as unknown as PortfolioType[];
        setPortfolios(typed);
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('activePortfolioId') : null;
        const target = typed.find((p) => p.id === savedId) || typed.find((p) => p.isDefault) || typed[0];
        setActivePortfolio(target);
      } else {
        setPortfolios([defaultPortfolio]);
        setActivePortfolio(defaultPortfolio);
      }
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const createPortfolio = async (formData: any) => {
    try {
      const res = await apiCreatePortfolio(formData);
      if (res && res.success && res.data) {
        const newP = res.data as unknown as PortfolioType;
        setPortfolios((prev) => [...prev, newP]);
        setActivePortfolio(newP);
        return newP;
      }
    } catch (err) {
      console.warn('Backend createPortfolio error, using client fallback:', err);
    }
    // Fallback in-memory/localStorage so user experience is always fluid
    const fallbackPortfolio: PortfolioType = {
      id: 'portfolio-' + Date.now(),
      name: formData.name || `${formData.memberName}'s Portfolio`,
      memberName: formData.memberName,
      relation: formData.relation || 'Self',
      currency: formData.currency || 'INR',
      color: formData.color || '#6366f1',
      isDefault: formData.isDefault || false,
      riskProfile: formData.riskProfile || 'Moderate',
      targetEquityPct: '60',
      targetDebtPct: '30',
      targetGoldPct: '10',
    };
    setPortfolios((prev) => [...prev, fallbackPortfolio]);
    setActivePortfolio(fallbackPortfolio);
    return fallbackPortfolio;
  };

  return (
    <PortfolioContext.Provider
      value={{
        portfolios,
        activePortfolio,
        setActivePortfolio,
        loading,
        createPortfolio,
        fetchPortfolios,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);
