import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage is live: indexable, reviewed count, manual-review link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Controlled tests');
  await expect(page.getByText('v0.2 live reviewed')).toBeVisible();
  await expect(page.getByText('Live reviewed · v0.2').first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
  await expect(page.getByRole('link', { name: 'Manual review' }).first()).toBeVisible();
});

test('model directory filters without losing server-rendered content', async ({ page }) => {
  await page.goto('/models/');
  await expect(page.locator('.model-card')).toHaveCount(17);
  await page.locator('#provider-filter').selectOption('venice');
  await expect(page.locator('.model-card:visible')).toHaveCount(8);
  await page.locator('#privacy-filter').selectOption('e2ee');
  await expect(page.locator('.model-card:visible')).toHaveCount(1);
  await expect(page.getByText('Qwen3.6 35B A3B Uncensored E2EE')).toBeVisible();
});

test('pending (excluded E2EE) profile is noindex and source-backed', async ({ page }) => {
  await page.goto('/models/qwen3-6-35b-uncensored-e2ee/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Qwen3.6 35B A3B Uncensored E2EE');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.getByText('Live benchmark pending.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
});

test('published model profile is indexable with v0.2 scores and raw cases', async ({ page }) => {
  await page.goto('/models/venice-uncensored-1-2/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Venice Uncensored 1.2');
  await expect(page.getByText('Live reviewed · v0.2')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
  await expect(page.getByRole('heading', { name: 'Raw per-case results' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Text track' })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('v0.2 text ranking shows the lived leaderboard with one pending row', async ({ page }) => {
  await page.goto('/rankings/text/');
  await expect(page.getByText('Live, human-reviewed v0.2 results for this modality.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(14);
  await expect(page.locator('tbody').getByText('PENDING')).toHaveCount(1);
  await expect(page.locator('tbody').getByText('72.8')).toBeVisible(); // venice-uncensored-1-2 recomputed overall
});

test('manual review page lists every run and every case', async ({ page }) => {
  await page.goto('/manual-review/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Manual review');
  await expect(page.getByText('16 live runs · 152 cases · 43 human-scored').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Every run, open' })).toBeVisible();
  await expect(page.getByText('Venice Uncensored 1.2').first()).toBeVisible();
  await expect(page.getByText('glm-5-2').first()).toBeVisible(); // run block slug appears
});

test('v0.1 legacy archive page explains non-comparability', async ({ page }) => {
  await page.goto('/rankings/v01-legacy/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('legacy');
  await expect(page.getByText('not comparable', { exact: false })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

test('adult showcase is noindex, age-gated, and blur-by-default', async ({ page }) => {
  await page.goto('/showcase/adult/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.getByRole('heading', { name: '18+ only' })).toBeVisible();
  await page.getByRole('button', { name: /I am 18 or older/i }).click();
  await expect(page.getByText('Blurred by default. Click a tile to reveal')).toBeVisible();
  const reveal = page.locator('[data-reveal]').first();
  await expect(reveal).toHaveAttribute('aria-expanded', 'false');
  await reveal.click();
  await expect(reveal).toHaveAttribute('aria-expanded', 'true');
});

test('mobile menu opens with accessible state', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});

test('core pages have no serious accessibility violations', async ({ page }) => {
  for (const route of ['/', '/models/', '/methodology/', '/editorial-policy/', '/rankings/text/', '/showcase/adult/', '/manual-review/']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
    expect(serious, `${route}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});

test('core pages emit no browser console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of ['/', '/models/', '/methodology/', '/rankings/text/', '/models/venice-uncensored-1-2/', '/manual-review/']) {
    await page.goto(route);
  }
  expect(errors).toEqual([]);
});

test('404 page is usable', async ({ page }) => {
  const response = await page.goto('/not-a-real-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('No evidence');
});
