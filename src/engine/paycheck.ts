import { allocate, cpfApplies, monthlyCpf, type CpfBalances, type IncomeKind, type Residency } from './cpf';
import { estimateAnnualTax } from './tax';

export interface Paycheck {
  gross: number;
  employeeCpf: number;
  employerCpf: number;
  totalCpf: number;
  takeHomeBeforeTax: number;
  /** Monthly amount to set aside for next year's income tax (simplified). */
  monthlyTaxSetAside: number;
  annualTax: number;
  spendable: number;
  allocation: CpfBalances;
  cpfModelled: boolean;
  notes: string[];
}

export function paycheck(gross: number, age: number, residency: Residency, kind: IncomeKind, year: number): Paycheck {
  const notes: string[] = [];
  const modelled = cpfApplies(residency, kind);
  const cpf = modelled ? monthlyCpf(gross, age, year) : { employee: 0, employer: 0, total: 0, wage: gross, cappedWage: gross };
  if (!modelled) {
    if (kind === 'allowance') notes.push('NS allowances do not attract CPF contributions.');
    else if (kind === 'self') notes.push('Self-employed and gig income is not subject to mandatory employee CPF here. Self-employed persons with net trade income above $6,000 a year must contribute to MediSave — not modelled.');
    else if (residency === 'other') notes.push('Foreigners on work passes do not contribute to CPF.');
  }
  if (residency === 'pr') notes.push('PRs in their first two years have lower, graduated CPF rates. We use full rates — your actual CPF may be lower and take-home higher.');
  if (residency === 'undisclosed') notes.push('You chose not to share residency, so we used Singapore Citizen rules.');
  if (modelled && gross > cpf.cappedWage) notes.push(`CPF is only charged on the first $${cpf.cappedWage.toLocaleString()} of monthly wages (Ordinary Wage ceiling).`);

  const annualTax = estimateAnnualTax(gross * 12, cpf.employee * 12, age, year).tax;
  const monthlyTaxSetAside = Math.round((annualTax / 12) * 100) / 100;
  const takeHomeBeforeTax = gross - cpf.employee;
  return {
    gross,
    employeeCpf: cpf.employee,
    employerCpf: cpf.employer,
    totalCpf: cpf.total,
    takeHomeBeforeTax,
    monthlyTaxSetAside,
    annualTax,
    spendable: takeHomeBeforeTax - monthlyTaxSetAside,
    allocation: allocate(cpf.total, age),
    cpfModelled: modelled,
    notes,
  };
}
