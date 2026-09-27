'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HouseholdFinancialState, RawHouseholdData } from '@/lib/engine/types';
import { getHouseholdStateAction } from '@/lib/actions/household-actions';
import { createCanonicalKarmakarFixture } from '@/lib/data/karmakar-fixture';
import { buildHouseholdState } from '@/lib/engine/state-builder';

export type MemberFilter = 'all' | 'Self' | 'Spouse' | 'Father' | 'Mother';

interface HouseholdContextType {
  state: HouseholdFinancialState;
  rawData: RawHouseholdData;
  loading: boolean;
  memberFilter: MemberFilter;
  setMemberFilter: (filter: MemberFilter) => void;
  familyId: string;
  familyName: string;
  refresh: () => Promise<void>;
}

const fallbackRawData = createCanonicalKarmakarFixture();
const fallbackState = buildHouseholdState(fallbackRawData);

const HouseholdContext = createContext<HouseholdContextType>({
  state: fallbackState,
  rawData: fallbackRawData,
  loading: false,
  memberFilter: 'all',
  setMemberFilter: () => {},
  familyId: '11111111-1111-1111-1111-111111111111',
  familyName: 'Karmakar Family',
  refresh: async () => {},
});

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HouseholdFinancialState>(fallbackState);
  const [rawData, setRawData] = useState<RawHouseholdData>(fallbackRawData);
  const [loading, setLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const familyId = '11111111-1111-1111-1111-111111111111';
  const familyName = 'Karmakar Family';

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getHouseholdStateAction(familyId);
      if (res && res.state && res.rawData) {
        setState(res.state);
        setRawData(res.rawData);
      }
    } catch (err) {
      console.warn('Could not load household state from server action, using fallback fixture:', err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider
      value={{
        state,
        rawData,
        loading,
        memberFilter,
        setMemberFilter,
        familyId,
        familyName,
        refresh,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export const useHousehold = () => useContext(HouseholdContext);
