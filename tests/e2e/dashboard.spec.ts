import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test('should load dashboard and render main elements', async ({ page }) => {
    // Nota: Assume-se que o usuário já está logado ou que há um mock de sessão
    await page.goto('/dashboard');
    
    // Verificar título
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Verificar se os cards de KPI aparecem
    await expect(page.getByText('Receita Total')).toBeVisible();
    await expect(page.getByText('Lucro Líquido')).toBeVisible();
    
    // Verificar se o seletor de período existe
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should change period and update URL', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.getByRole('combobox').click();
    await page.getByLabel('Hoje').click();
    
    await expect(page).toHaveURL(/.*preset=today/);
  });
});
