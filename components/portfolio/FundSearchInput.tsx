'use client';

import React, { useState, useEffect } from 'react';
async function searchMfScheme(query: string) {
  const res = await fetch(`/api/mf/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return { data: data.data || data };
}

const FundSearchInput = ({ onSelect }: { onSelect: (scheme: any) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!query || query.length < 3) {
            setResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchMfScheme(query);
                if(data && data.data) {
                    setResults(data.data.slice(0, 10)); // keep it reasonable
                }
                setOpen(true);
            } catch (error: any) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (scheme: any) => {
        setQuery(scheme.schemeName);
        setOpen(false);
        onSelect({
            name: scheme.schemeName,
            amfiCode: String(scheme.schemeCode)
        });
    };

    return (
        <div className="relative">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Mutual Fund Name..."
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {loading && <div className="absolute right-3 top-3 text-xs text-gray-400">Searching...</div>}
            {open && results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 max-h-60 overflow-auto rounded shadow-lg">
                    {results.map((r, i) => (
                        <li 
                            key={i} 
                            onClick={() => handleSelect(r)}
                            className="p-2 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        >
                            {r.schemeName}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default FundSearchInput;