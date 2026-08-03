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
  await expect(page.locator('.model-card')).toHaveCount(19);
  await page.locator('#provider-filter').selectOption('venice');
  await expect(page.locator('.model-card:visible')).toHaveCount(10);
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

test('published model profile shows every question beside its answer', async ({ page }) => {
  await page.goto('/models/venice-uncensored-1-2/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Venice Uncensored 1.2');
  await expect(page.getByText('Live reviewed · v0.2')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
  await expect(page.getByRole('heading', { name: 'Raw per-case results' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Text track' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(11);
  await expect(page.locator('thead').getByText('Question')).toBeVisible();
  await expect(page.locator('thead').getByText('Answer / evidence')).toBeVisible();
  await expect(page.getByText('Creative prose — noir rain alley')).toBeVisible();
  await expect(page.getByText('Write the opening chapter (250–400 words)', { exact: false })).toBeVisible();
});

test('showcase groups all tests and eligible model answers for comparison', async ({ page }) => {
  await page.goto('/showcase/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Model answer showcase');
  await expect(page.locator('.case-showcase')).toHaveCount(20);
  await expect(page.locator('#t1 .answer-card')).toHaveCount(13);
  await expect(page.locator('#i1 .answer-card')).toHaveCount(1);
  await expect(page.getByText('Write the opening chapter (250–400 words)', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#t1').getByText('Venice Uncensored 1.2')).toBeVisible();
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
  await expect(page.getByText(/16 live runs · 152 cases · \d+ human-scored/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Every run, open' })).toBeVisible();
  await expect(page.getByText('Venice Uncensored 1.2').first()).toBeVisible();
  await expect(page.getByText('glm-5-2').first()).toBeVisible(); // run block slug appears
});

test('/review is a complete review dashboard, not a redirect or 404', async ({ page }) => {
  const response = await page.goto('/review/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/review\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Manual review');
  await expect(page.getByRole('heading', { name: 'Every run, open' })).toBeVisible();
  await expect(page.getByText('Venice Uncensored 1.2').first()).toBeVisible();
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
  await expect(page.getByText('These three sources are uniformly blurred')).toBeVisible();
  await expect(page.getByText('Live result: showcase')).toHaveCount(3);
  await expect(page.locator('.adult-tile')).toHaveCount(3);
  await expect(page.getByText('FLUX.2 Pro')).toBeVisible();
  await expect(page.getByText('Qwen Image 2')).toBeVisible();
  await expect(page.getByText('Three image models completed the same lawful-adult I5 prompt')).toBeVisible();
  await expect(page.getByText('The site cannot reveal detail that is absent from the source file', { exact: false })).toHaveCount(3);
  await expect(page.locator('[data-reveal]')).toHaveCount(0);
  await expect(page.locator('.adult-tile__image')).toHaveCount(3);
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
  test.setTimeout(90_000);
  for (const route of ['/', '/models/', '/methodology/', '/editorial-policy/', '/rankings/text/', '/showcase/', '/showcase/adult/', '/manual-review/', '/review/']) {
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
  for (const route of ['/', '/models/', '/methodology/', '/rankings/text/', '/showcase/', '/models/venice-uncensored-1-2/', '/manual-review/']) {
    await page.goto(route);
  }
  expect(errors).toEqual([]);
});

test('404 page is usable', async ({ page }) => {
  const response = await page.goto('/not-a-real-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('No evidence');
});
