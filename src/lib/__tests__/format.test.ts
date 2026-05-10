import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatDate } from '../format';

describe('Format Utilities', () => {
  it('should format currency correctly in BRL', () => {
    expect(formatCurrency(1234.56)).toBe('R$\u00a01.234,56');
  });

  it('should format numbers with Brazilian locale', () => {
    expect(formatNumber(1234567.89)).toBe('1.234.567,89');
  });

  it('should format dates in dd/MM/yyyy pattern', () => {
    const date = new Date('2024-05-10T12:00:00Z');
    expect(formatDate(date)).toBe('10/05/2024');
  });
});
