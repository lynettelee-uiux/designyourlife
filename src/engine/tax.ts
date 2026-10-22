import { RESIDENT_TAX_BANDS, EARNED_INCOME_RELIEF_BELOW_55, CPF_ANNUAL_SALARY_CEILING } from './assumptions';
import { rateBand } from './cpf';

/** Progressive resident tax on chargeable income. */
export function residentTax(chargeable: number): number {
  let remaining = Math.max(0, chargeable);
  let lower = 0;
  let tax = 0;
  for (const band of RESIDENT_TAX_BANDS) {
    const slice = Math.min(remaining, band.upTo - lower);
    tax += slice * band.rate;
    remaining -= slice;
    lower = band.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(tax * 100) / 100;
}

export interface TaxEstimate {
  assessable: number;
  reliefs: number;
  chargeable: number;
  tax: number;
}

/**
 * Simplified estimate for a tax-resident employee: Earned Income Relief + CPF Relief only.
 * CPF Relief is limited to compulsory employee contributions on wages up to the annual salary ceiling.
 */
export function estimateAnnualTax(annualIncome: number, annualEmployeeCpf: number, age: number, year: number): TaxEstimate {
  const eir = age < 55 ? EARNED_INCOME_RELIEF_BELOW_55 : 0;
  const cpfReliefCap = CPF_ANNUAL_SALARY_CEILING * rateBand(age, year).employee;
  const cpfRelief = Math.min(annualEmployeeCpf, cpfReliefCap);
  const reliefs = Math.min(eir + cpfRelief, 80000); // overall personal relief cap
  const chargeable = Math.max(0, annualIncome - reliefs);
  return { assessable: annualIncome, reliefs, chargeable, tax: residentTax(chargeable) };
}
