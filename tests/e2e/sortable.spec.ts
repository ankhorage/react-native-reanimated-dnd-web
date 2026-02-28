import { expect, test, type Page } from '@playwright/test';

const SETTLE_TIMEOUT_MS = 500;
const STABLE_WINDOW_MS = 200;

async function readOrder(page: Page): Promise<string[]> {
  const values = await page.locator('[data-testid^="item-"]').allInnerTexts();
  return values.map((entry) => entry.trim());
}

async function dragBy(page: Page, testId: string, deltaX: number, deltaY: number): Promise<void> {
  const locator = page.locator(`[data-testid="${testId}"]`);
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}`);
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
}

async function dragOutsideAndBack(page: Page, testId: string, deltaX: number, deltaY: number): Promise<void> {
  const locator = page.locator(`[data-testid="${testId}"]`);
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}`);
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(-40, -40, { steps: 8 });
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function waitForSettledOrder(page: Page, expected: string[]): Promise<void> {
  const startedAt = Date.now();
  let stableStartedAt = 0;
  let lastOrderSignature = '';

  while (Date.now() - startedAt <= SETTLE_TIMEOUT_MS) {
    const currentOrder = await readOrder(page);
    const signature = JSON.stringify(currentOrder);

    if (signature === JSON.stringify(expected)) {
      if (lastOrderSignature === signature) {
        if (Date.now() - stableStartedAt >= STABLE_WINDOW_MS) {
          return;
        }
      } else {
        stableStartedAt = Date.now();
      }
    } else {
      stableStartedAt = 0;
    }

    lastOrderSignature = signature;
    await page.waitForTimeout(20);
  }

  const finalOrder = await readOrder(page);
  expect(finalOrder).toEqual(expected);
}

test.describe('sortable web reliability', () => {
  test('vertical reorder is deterministic and reports expected callbacks', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        errors.push(message.text());
      }
    });

    await page.goto('/demos/sortable-vertical');
    await expect(page.locator('[data-testid="demo-vertical"]')).toBeVisible();
    await expect(readOrder(page)).resolves.toEqual(['Alpha', 'Beta', 'Gamma']);

    await dragBy(page, 'handle-a', 0, 130);
    await waitForSettledOrder(page, ['Beta', 'Gamma', 'Alpha']);

    const dragEvents = await page.evaluate(() => window.__dragEvents ?? []);
    const lastEvent = dragEvents.at(-1);
    expect(lastEvent).toEqual({
      demo: 'vertical',
      itemId: 'a',
      fromIndex: 0,
      toIndex: 2,
    });

    expect(errors).toEqual([]);
  });

  test('horizontal reorder works and remains stable after pointer exits container', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        errors.push(message.text());
      }
    });

    await page.goto('/demos/sortable-horizontal');
    await expect(page.locator('[data-testid="demo-horizontal"]')).toBeVisible();
    await expect(readOrder(page)).resolves.toEqual(['One', 'Two', 'Three']);

    await dragOutsideAndBack(page, 'handle-a', 280, 0);
    await waitForSettledOrder(page, ['Two', 'Three', 'One']);

    const dragEvents = await page.evaluate(() => window.__dragEvents ?? []);
    const lastEvent = dragEvents.at(-1);
    expect(lastEvent).toEqual({
      demo: 'horizontal',
      itemId: 'a',
      fromIndex: 0,
      toIndex: 2,
    });

    expect(errors).toEqual([]);
  });
});
