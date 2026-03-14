import { expect, test, type Page } from '@playwright/test';

async function getCenter(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const locator = page.locator(`[data-testid="${testId}"]`);
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}`);
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

async function dragBy(page: Page, testId: string, deltaX: number, deltaY: number): Promise<void> {
  const start = await getCenter(page, testId);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 12 });
  await page.mouse.up();
}

async function dragToTarget(page: Page, sourceTestId: string, targetTestId: string): Promise<void> {
  const start = await getCenter(page, sourceTestId);
  const target = await getCenter(page, targetTestId);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 16 });
  await page.mouse.up();
}

async function dragViaAndDrop(
  page: Page,
  sourceTestId: string,
  viaDeltaX: number,
  viaDeltaY: number,
  targetTestId: string,
): Promise<void> {
  const start = await getCenter(page, sourceTestId);
  const target = await getCenter(page, targetTestId);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + viaDeltaX, start.y + viaDeltaY, { steps: 8 });
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
}

test.describe('draggable web compatibility', () => {
  test('basic demo resets misses, constrains axis movement, and honors dragDisabled', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto('/demos/draggable-basic');
    await expect(page.locator('[data-testid="demo-draggable-basic"]')).toBeVisible();

    const freeBefore = await page.locator('[data-testid="free-draggable"]').boundingBox();
    if (!freeBefore) {
      throw new Error('Missing free draggable');
    }

    await dragBy(page, 'free-draggable', 180, 110);
    await page.waitForTimeout(80);

    const freeAfter = await page.locator('[data-testid="free-draggable"]').boundingBox();
    expect(freeAfter?.x).toBeCloseTo(freeBefore.x, 1);
    expect(freeAfter?.y).toBeCloseTo(freeBefore.y, 1);

    await dragBy(page, 'axis-draggable', 220, 90);
    await page.waitForTimeout(80);

    const axisEvents = await page.evaluate(() =>
      (window.__draggableEvents ?? []).filter(
        (event) => event.type === 'dragging' && event.draggableId === 'axis-item',
      ),
    );
    expect(axisEvents.length).toBeGreaterThan(0);
    const maxY = Math.max(...axisEvents.map((event: { ty: number }) => Math.abs(event.ty)));
    const maxX = Math.max(...axisEvents.map((event: { tx: number }) => event.tx));
    expect(maxY).toBeLessThan(2);
    expect(maxX).toBeLessThanOrEqual(188);

    const disabledBefore = await page.locator('[data-testid="disabled-draggable"]').boundingBox();
    if (!disabledBefore) {
      throw new Error('Missing disabled draggable');
    }

    await dragBy(page, 'disabled-draggable', 140, 20);
    await page.waitForTimeout(80);

    const disabledAfter = await page.locator('[data-testid="disabled-draggable"]').boundingBox();
    expect(disabledAfter?.x).toBeCloseTo(disabledBefore.x, 1);
    expect(disabledAfter?.y).toBeCloseTo(disabledBefore.y, 1);

    const events = await page.evaluate(() => window.__draggableEvents ?? []);
    expect(events.some((event: { draggableId: string }) => event.draggableId === 'disabled-item')).toBe(
      false,
    );

    expect(errors).toEqual([]);
  });

  test('dropzones demo enforces handle-only drag and resolves drops deterministically', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        warnings.push(message.text());
      }
    });

    await page.goto('/demos/draggable-dropzones');
    await expect(page.locator('[data-testid="demo-draggable-dropzones"]')).toBeVisible();

    const handleCardBefore = await page.locator('[data-testid="handle-draggable"]').boundingBox();
    if (!handleCardBefore) {
      throw new Error('Missing handle-only draggable');
    }

    await dragBy(page, 'handle-draggable-body', -40, -140);
    await page.waitForTimeout(80);

    const handleCardAfterBody = await page.locator('[data-testid="handle-draggable"]').boundingBox();
    expect(handleCardAfterBody?.x).toBeCloseTo(handleCardBefore.x, 1);
    expect(handleCardAfterBody?.y).toBeCloseTo(handleCardBefore.y, 1);

    await dragToTarget(page, 'handle-draggable-handle', 'droppable-zone-a');
    await page.waitForTimeout(80);

    const zoneAActive = await page.locator('[data-testid="zone-a-active"]').innerText();
    expect(zoneAActive).toBe('false');

    let snapshots = await page.evaluate(() => window.__droppedItemsSnapshots ?? []);
    expect(snapshots.at(-1)).toEqual({
      'handle-item': {
        droppableId: 'zone-a',
        data: { id: 'handle-item', label: 'Handle Item' },
      },
    });

    const dropEvents = await page.evaluate(() =>
      (window.__draggableEvents ?? []).filter((event) => event.type === 'drop'),
    );
    expect(dropEvents.at(-1)).toEqual({
      type: 'drop',
      demo: 'dropzones',
      draggableId: 'handle-item',
      droppableId: 'zone-a',
    });

    await dragViaAndDrop(page, 'handle-draggable-handle', 140, 120, 'droppable-zone-a');
    await page.waitForTimeout(80);

    snapshots = await page.evaluate(() => window.__droppedItemsSnapshots ?? []);
    const latestSnapshot = snapshots.at(-1);
    expect(Object.keys(latestSnapshot ?? {})).toEqual(['handle-item']);
    expect(latestSnapshot).toEqual({
      'handle-item': {
        droppableId: 'zone-a',
        data: { id: 'handle-item', label: 'Handle Item' },
      },
    });

    await dragToTarget(page, 'disabled-target-draggable', 'droppable-zone-disabled');
    await page.waitForTimeout(80);

    const disabledZoneActive = await page.locator('[data-testid="zone-disabled-active"]').innerText();
    expect(disabledZoneActive).toBe('false');
    const disabledEvents = await page.evaluate(() =>
      (window.__draggableEvents ?? []).filter(
        (event) => event.type === 'drop' && event.draggableId === 'disabled-check',
      ),
    );
    expect(disabledEvents).toEqual([]);

    expect(warnings).toEqual([]);
  });
});
