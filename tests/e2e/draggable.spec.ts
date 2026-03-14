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

async function getRoundedTopLeft(
  page: Page,
  testId: string,
): Promise<{ x: number; y: number } | null> {
  const box = await page.locator(`[data-testid="${testId}"]`).boundingBox();
  if (!box) {
    return null;
  }

  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
  };
}

async function waitForTopLeft(
  page: Page,
  testId: string,
  expected: { x: number; y: number },
): Promise<void> {
  await expect.poll(() => getRoundedTopLeft(page, testId)).toEqual(expected);
}

async function waitForDroppedSnapshot(page: Page, expected: unknown): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => (window.__droppedItemsSnapshots ?? []).at(-1) ?? null))
    .toEqual(expected);
}

async function waitForLastDropEvent(page: Page, expected: unknown): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dropEvents = (window.__draggableEvents ?? []).filter((event) => event.type === 'drop');
        return dropEvents.at(-1) ?? null;
      }),
    )
    .toEqual(expected);
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
    const freeStart = {
      x: Math.round(freeBefore.x),
      y: Math.round(freeBefore.y),
    };

    await dragBy(page, 'free-draggable', 180, 110);
    await waitForTopLeft(page, 'free-draggable', freeStart);

    await dragBy(page, 'axis-draggable', 220, 90);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__draggableEvents ?? []).filter(
              (event) => event.type === 'dragging' && event.draggableId === 'axis-item',
            ).length,
        ),
      )
      .toBeGreaterThan(0);

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
    const disabledStart = {
      x: Math.round(disabledBefore.x),
      y: Math.round(disabledBefore.y),
    };

    await dragBy(page, 'disabled-draggable', 140, 20);
    await waitForTopLeft(page, 'disabled-draggable', disabledStart);

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
    const handleStart = {
      x: Math.round(handleCardBefore.x),
      y: Math.round(handleCardBefore.y),
    };

    await dragBy(page, 'handle-draggable-body', -40, -140);
    await waitForTopLeft(page, 'handle-draggable', handleStart);

    await dragToTarget(page, 'handle-draggable-handle', 'droppable-zone-a');
    await expect(page.locator('[data-testid="zone-a-active"]')).toHaveText('false');

    await waitForDroppedSnapshot(page, {
      'handle-item': {
        droppableId: 'zone-a',
        data: { id: 'handle-item', label: 'Handle Item' },
      },
    });

    await waitForLastDropEvent(page, {
      type: 'drop',
      demo: 'dropzones',
      draggableId: 'handle-item',
      droppableId: 'zone-a',
    });

    await dragViaAndDrop(page, 'handle-draggable-handle', 140, 120, 'droppable-zone-a');
    await waitForDroppedSnapshot(page, {
      'handle-item': {
        droppableId: 'zone-a',
        data: { id: 'handle-item', label: 'Handle Item' },
      },
    });
    const latestSnapshot = await page.evaluate(() => (window.__droppedItemsSnapshots ?? []).at(-1) ?? {});
    expect(Object.keys(latestSnapshot ?? {})).toEqual(['handle-item']);

    await dragToTarget(page, 'disabled-target-draggable', 'droppable-zone-disabled');
    await expect(page.locator('[data-testid="zone-disabled-active"]')).toHaveText('false');
    const disabledEvents = await page.evaluate(() =>
      (window.__draggableEvents ?? []).filter(
        (event) => event.type === 'drop' && event.draggableId === 'disabled-check',
      ),
    );
    expect(disabledEvents).toEqual([]);

    expect(warnings).toEqual([]);
  });
});
