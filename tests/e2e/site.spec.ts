import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage leads with the v0.3 suite and a published live run', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('33 tests.');
  await expect(page.locator('.matrix-cell')).toHaveCount(33);
  await expect(page.getByText('163', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('published', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Published ranks').first()).toBeVisible();
  await expect(page.getByText('The old benchmark moved out of the way.')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
  await expect(page.getByText('v0.2 reviewed baseline')).toHaveCount(0);
});

test('suite catalog exposes all 33 frozen definitions in four tracks', async ({ page }) => {
  await page.goto('/suite/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The suite, test by test.');
  await expect(page.locator('.matrix-track')).toHaveCount(4);
  await expect(page.locator('.matrix-cell')).toHaveCount(33);
  await expect(page.locator('.case-row')).toHaveCount(33);
  await expect(page.getByText('28', { exact: true })).toBeVisible();
  await expect(page.getByText('5', { exact: true })).toBeVisible();
});

test('lawful case details publish prompts while private controls stay withheld', async ({ page }) => {
  await page.goto('/suite/u2/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('U2');
  await expect(page.getByText('Exact public test prompt')).toBeVisible();
  await expect(page.getByText('A man looks in the bathroom mirror', { exact: false })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);

  await page.goto('/suite/ut6/');
  await expect(page.getByText('Exact control withheld.')).toBeVisible();
  await expect(page.getByText('[PRIVATE CONTROL:', { exact: false })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

test('adult case definitions remain noindex and collapsed by default', async ({ page }) => {
  await page.goto('/suite/u1/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  const definition = page.locator('.prompt-card');
  await expect(definition).not.toHaveAttribute('open', '');
  await expect(definition.getByText('18+ test prompt — open definition')).toBeVisible();
});

test('run ledger reports coverage and failures with published outcomes', async ({ page }) => {
  await page.goto('/results/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('18 models published.');
  await expect(page.locator('.ledger-row')).toHaveCount(19);
  await expect(page.locator('.failure-list article')).toHaveCount(2);
  await expect(page.getByText('$5.49', { exact: true })).toBeVisible();
  await expect(page.getByText('72.8', { exact: true })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

test('current track routes are published evidence ledgers', async ({ page }) => {
  for (const modality of ['text', 'image', 'video', 'audio']) {
    await page.goto(`/rankings/${modality}/`);
    await expect(page.getByText('Live run reviewed. Evidence published.')).toBeVisible();
    await expect(page.getByText('Looking for the old scores?')).toBeVisible();
    await expect(page.locator('.ranking-table-wrap')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  }
});

test('v0.2 scores survive only inside the versioned archive', async ({ page }) => {
  await page.goto('/archive/v02/');
  await expect(page.getByText('RETIRED / 0.2.0')).toBeVisible();
  await page.getByRole('link', { name: /Text scores/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Archived v0.2 text leaderboard');
  await expect(page.locator('tbody tr')).toHaveCount(14);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

test('model directory filters retain 19 server-rendered route records', async ({ page }) => {
  await page.goto('/models/');
  await expect(page.locator('.model-card')).toHaveCount(19);
  await page.locator('#provider-filter').selectOption('venice');
  await expect(page.locator('.model-card:visible')).toHaveCount(10);
  await page.locator('#privacy-filter').selectOption('e2ee');
  await expect(page.locator('.model-card:visible')).toHaveCount(1);
  await expect(page.getByText('Qwen3.6 35B A3B Uncensored E2EE')).toBeVisible();
});

test('model profiles expose published run state', async ({ page }) => {
  await page.goto('/models/venice-uncensored-1-2/');
  await expect(page.getByText('Live run · published')).toBeVisible();
  await expect(page.getByRole('heading', { name: '9 delivered · 0 refused' })).toBeVisible();
  await expect(page.getByText('Raw per-case results')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');

  await page.goto('/models/qwen3-6-35b-uncensored-e2ee/');
  await expect(page.getByText('Excluded · transport timeout')).toBeVisible();
  await expect(page.getByText('No result is inferred from transport failure.')).toBeVisible();
});

test('review and methodology pages explain the two-human fail-closed gate', async ({ page }) => {
  await page.goto('/review/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('163 decisions. 161 approved.');
  await expect(page.locator('.review-steps li')).toHaveCount(4);
  await expect(page.getByText('99%', { exact: true })).toBeVisible();

  await page.goto('/methodology/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Capability and safety are different questions.');
  await expect(page.getByRole('heading', { name: 'The gate fails closed.' })).toBeVisible();
  await expect(page.getByText('two reviewers', { exact: false })).toBeVisible();
});

test('old showcase and answer comparison are unmistakably archived', async ({ page }) => {
  await page.goto('/showcase/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Archived v0.2');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');

  await page.goto('/compare/?test=T1&models=aion-3-0,cydonia-24b-v4-1,venice-uncensored-1-2');
  await expect(page.getByText('RETIRED / 0.2.0')).toBeVisible();
  await expect(page.locator('#model-headings th')).toHaveCount(4);
});

test('mobile disclosure menu opens without client JavaScript', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.goto('/');
  const menu = page.locator('.mobile-nav');
  await expect(menu).not.toHaveAttribute('open', '');
  await menu.locator('summary').click();
  await expect(menu).toHaveAttribute('open', '');
  await expect(menu.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});

test('core v0.3 pages have no serious accessibility violations', async ({ page }) => {
  test.setTimeout(90_000);
  for (const route of ['/', '/suite/', '/suite/u2/', '/suite/ut6/', '/results/', '/models/', '/models/venice-uncensored-1-2/', '/methodology/', '/review/', '/rankings/text/', '/archive/v02/']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
    expect(serious, `${route}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});

test('core v0.3 pages emit no browser console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of ['/', '/suite/', '/suite/u2/', '/results/', '/models/', '/methodology/', '/review/', '/rankings/text/', '/archive/v02/']) await page.goto(route);
  expect(errors).toEqual([]);
});

test('404 page is usable', async ({ page }) => {
  const response = await page.goto('/not-a-real-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('No evidence');
});
