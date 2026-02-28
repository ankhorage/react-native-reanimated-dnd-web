import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Sortable, SortableItem } from '../../src/sortableCompat.web';

type DemoItem = { id: string; label: string };
type DragEventRecord = {
  demo: 'vertical' | 'horizontal';
  itemId: string;
  fromIndex: number;
  toIndex: number;
};

declare global {
  interface Window {
    __dragEvents?: DragEventRecord[];
  }
}

function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return items;
  }
  next.splice(toIndex, 0, moved);
  return next;
}

function getDemoFromPathname(pathname: string): 'vertical' | 'horizontal' {
  if (pathname.includes('/demos/sortable-horizontal')) {
    return 'horizontal';
  }
  return 'vertical';
}

function pushDragEvent(record: DragEventRecord): void {
  if (typeof window === 'undefined') {
    return;
  }

  const events = window.__dragEvents ?? [];
  events.push(record);
  window.__dragEvents = events;
}

function VerticalDemo(): React.JSX.Element {
  const [items, setItems] = useState<DemoItem[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ]);

  return (
    <View testID="demo-vertical" style={styles.page}>
      <Text testID="demo-title" style={styles.title}>
        Vertical Sortable Demo
      </Text>
      <View style={styles.listWrap}>
        <Sortable
          data={items}
          direction="vertical"
          itemHeight={60}
          gap={8}
          itemKeyExtractor={(item) => item.id}
          renderItem={({ item, id, positions, itemsCount, lowerBound, autoScrollDirection }) => (
            <SortableItem
              id={id}
              data={item}
              direction="vertical"
              positions={positions}
              itemsCount={itemsCount}
              itemHeight={60}
              lowerBound={lowerBound}
              autoScrollDirection={autoScrollDirection}
              onDrop={(droppedId, toIndex) => {
                const fromIndex = items.findIndex((candidate) => candidate.id === droppedId);
                if (fromIndex < 0) {
                  return;
                }

                setItems((current) => reorder(current, fromIndex, toIndex));
                pushDragEvent({
                  demo: 'vertical',
                  itemId: droppedId,
                  fromIndex,
                  toIndex,
                });
              }}
            >
              <View testID={`row-${item.id}`} style={styles.row}>
                <Text testID={`item-${item.id}`} style={styles.itemLabel}>
                  {item.label}
                </Text>
                <SortableItem.Handle style={styles.handle}>
                  <View testID={`handle-${item.id}`}>
                    <Text style={styles.handleText}>↕</Text>
                  </View>
                </SortableItem.Handle>
              </View>
            </SortableItem>
          )}
        />
      </View>
    </View>
  );
}

function HorizontalDemo(): React.JSX.Element {
  const [items, setItems] = useState<DemoItem[]>([
    { id: 'a', label: 'One' },
    { id: 'b', label: 'Two' },
    { id: 'c', label: 'Three' },
  ]);

  return (
    <View testID="demo-horizontal" style={styles.page}>
      <Text testID="demo-title" style={styles.title}>
        Horizontal Sortable Demo
      </Text>
      <View style={styles.horizontalWrap}>
        <Sortable
          data={items}
          direction="horizontal"
          itemWidth={130}
          gap={10}
          itemKeyExtractor={(item) => item.id}
          renderItem={({
            item,
            id,
            positions,
            itemsCount,
            leftBound,
            autoScrollHorizontalDirection,
          }) => (
            <SortableItem
              id={id}
              data={item}
              direction="horizontal"
              positions={positions}
              itemsCount={itemsCount}
              itemWidth={130}
              leftBound={leftBound}
              autoScrollHorizontalDirection={autoScrollHorizontalDirection}
              onDrop={(droppedId, toIndex) => {
                const fromIndex = items.findIndex((candidate) => candidate.id === droppedId);
                if (fromIndex < 0) {
                  return;
                }

                setItems((current) => reorder(current, fromIndex, toIndex));
                pushDragEvent({
                  demo: 'horizontal',
                  itemId: droppedId,
                  fromIndex,
                  toIndex,
                });
              }}
            >
              <View testID={`row-${item.id}`} style={styles.horizontalRow}>
                <Text testID={`item-${item.id}`} style={styles.itemLabel}>
                  {item.label}
                </Text>
                <SortableItem.Handle style={styles.handle}>
                  <View testID={`handle-${item.id}`}>
                    <Text style={styles.handleText}>↔</Text>
                  </View>
                </SortableItem.Handle>
              </View>
            </SortableItem>
          )}
        />
      </View>
    </View>
  );
}

export function App(): React.JSX.Element {
  const demo = useMemo(() => getDemoFromPathname(window.location.pathname), []);

  return demo === 'horizontal' ? <HorizontalDemo /> : <VerticalDemo />;
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: 24,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
  },
  listWrap: {
    width: 360,
  },
  horizontalWrap: {
    width: 430,
    overflow: 'hidden',
  },
  row: {
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row' as const,
  },
  horizontalRow: {
    height: 70,
    width: 130,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row' as const,
  },
  itemLabel: {
    color: '#f8fafc',
    fontWeight: 600,
    fontSize: 14,
  },
  handle: {
    borderRadius: 8,
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  handleText: {
    color: '#cbd5e1',
    fontWeight: 700,
  },
};
