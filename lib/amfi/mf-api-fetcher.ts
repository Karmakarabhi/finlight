export async function fetchNav(amfiCode: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${amfiCode}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      const latestNav = data.data[0].nav;
      return parseFloat(latestNav);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching NAV for AMFI code ${amfiCode}:`, error);
    return null;
  }
}

export async function searchMutualFund(query: string) {
  try {
    const response = await fetch('https://api.mfapi.in/mf/search?q=' + encodeURIComponent(query));
    if (!response.ok) return [];
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error searching mutual fund for query ${query}:`, error);
    return [];
  }
}
