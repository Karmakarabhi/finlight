export type Cashflow = {
  amount: number;
  date: Date;
};

const DAYS_IN_YEAR = 365;

export function xirr(cashflows: Cashflow[], guess = 0.1): number {
  if (cashflows.length < 2) return 0;
  
  // Sort cashflows by date
  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const t0 = sorted[0].date.getTime();
  
  // Calculate years from start for each cashflow
  const cfs = sorted.map(cf => ({
    amount: cf.amount,
    years: (cf.date.getTime() - t0) / (1000 * 60 * 60 * 24 * DAYS_IN_YEAR)
  }));
  
  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;
    
    for (const cf of cfs) {
      const denom = Math.pow(1 + rate, cf.years);
      fValue += cf.amount / denom;
      // Derivative of (A / (1+r)^Y) w.r.t r is - (Y * A) / (1+r)^(Y+1)
      fDerivative -= (cf.years * cf.amount) / Math.pow(1 + rate, cf.years + 1);
    }
    
    if (Math.abs(fValue) < tolerance) {
      return rate;
    }
    
    if (fDerivative === 0) break;
    
    rate = rate - fValue / fDerivative;
  }
  
  return rate;
}
