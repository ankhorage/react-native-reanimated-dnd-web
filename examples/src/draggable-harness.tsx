import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Draggable, Droppable, DropProvider } from '../../src/sortableCompat.web';

type DraggableDemo = 'basic' | 'dropzones';

type EventRecord =
  | { type: 'drag-start'; demo: DraggableDemo; draggableId: string }
  | { type: 'drag-end'; demo: DraggableDemo; draggableId: string }
  | { type: 'state'; demo: DraggableDemo; draggableId: string; state: string }
  | { type: 'dragging'; demo: DraggableDemo; draggableId: string; tx: number; ty: number }
  | { type: 'drop'; demo: DraggableDemo; draggableId: string; droppableId: string }
  | { type: 'active'; demo: DraggableDemo; droppableId: string; isActive: boolean };

type DroppedItemsSnapshot = Record<string, { droppableId: string; data: unknown }>;

declare global {
  interface Window {
    __draggableEvents?: EventRecord[];
    __droppedItemsSnapshots?: DroppedItemsSnapshot[];
  }
}

function getDemoFromPathname(pathname: string): DraggableDemo {
  if (pathname.includes('/demos/draggable-dropzones')) {
    return 'dropzones';
  }

  return 'basic';
}

function pushEvent(record: EventRecord): void {
  if (typeof window === 'undefined') {
    return;
  }

  const events = window.__draggableEvents ?? [];
  events.push(record);
  window.__draggableEvents = events;
}

function pushDroppedItemsSnapshot(snapshot: DroppedItemsSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  const snapshots = window.__droppedItemsSnapshots ?? [];
  snapshots.push(snapshot);
  window.__droppedItemsSnapshots = snapshots;
}

function BasicDemo(): React.JSX.Element {
  const boundsRef = useRef<View>(null);

  return (
    <DropProvider>
      <View testID="demo-draggable-basic" style={styles.page}>
        <Text style={styles.title}>Draggable Basic Harness</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reset On Miss</Text>
          <Draggable
            draggableId="free-item"
            data={{ id: 'free-item', label: 'Free' }}
            onDragStart={() => pushEvent({ type: 'drag-start', demo: 'basic', draggableId: 'free-item' })}
            onDragEnd={() => pushEvent({ type: 'drag-end', demo: 'basic', draggableId: 'free-item' })}
            onStateChange={(state) =>
              pushEvent({ type: 'state', demo: 'basic', draggableId: 'free-item', state })
            }
          >
            <View testID="free-draggable" style={styles.card}>
              <Text style={styles.cardLabel}>Free Drag</Text>
            </View>
          </Draggable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Axis And Bounds</Text>
          <View ref={boundsRef} testID="bounds-box" style={styles.boundsBox}>
            <Draggable
              draggableId="axis-item"
              data={{ id: 'axis-item', label: 'Axis' }}
              dragAxis="x"
              dragBoundsRef={boundsRef}
              onDragging={(payload) =>
                pushEvent({
                  type: 'dragging',
                  demo: 'basic',
                  draggableId: 'axis-item',
                  tx: payload.tx,
                  ty: payload.ty,
                })
              }
            >
              <View testID="axis-draggable" style={styles.axisCard}>
                <Text style={styles.cardLabel}>Axis Locked</Text>
              </View>
            </Draggable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Disabled Drag</Text>
          <Draggable
            draggableId="disabled-item"
            data={{ id: 'disabled-item', label: 'Disabled' }}
            dragDisabled
            onDragStart={() =>
              pushEvent({ type: 'drag-start', demo: 'basic', draggableId: 'disabled-item' })
            }
          >
            <View testID="disabled-draggable" style={[styles.card, styles.disabledCard]}>
              <Text style={styles.cardLabel}>Disabled</Text>
            </View>
          </Draggable>
        </View>
      </View>
    </DropProvider>
  );
}

function DropzonesDemo(): React.JSX.Element {
  const [zoneAActive, setZoneAActive] = useState(false);
  const [zoneDisabledActive, setZoneDisabledActive] = useState(false);

  return (
    <DropProvider
      onDroppedItemsUpdate={(droppedItems) => pushDroppedItemsSnapshot(droppedItems)}
    >
      <View testID="demo-draggable-dropzones" style={styles.page}>
        <Text style={styles.title}>Draggable Dropzones Harness</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overlapping Eligible Dropzones</Text>
          <View style={styles.dropArena}>
            <Droppable
              droppableId="zone-a"
              capacity={2}
              style={[styles.dropZone, styles.dropZoneA]}
              onDrop={() =>
                pushEvent({ type: 'drop', demo: 'dropzones', draggableId: 'handle-item', droppableId: 'zone-a' })
              }
              onActiveChange={(isActive) => {
                setZoneAActive(isActive);
                pushEvent({ type: 'active', demo: 'dropzones', droppableId: 'zone-a', isActive });
              }}
              activeStyle={styles.activeZone}
            >
              <View testID="droppable-zone-a" style={styles.dropZoneContent}>
                <Text style={styles.zoneLabel}>Zone A</Text>
                <Text testID="zone-a-active" style={styles.zoneMeta}>
                  {String(zoneAActive)}
                </Text>
              </View>
            </Droppable>

            <Droppable
              droppableId="zone-b"
              capacity={2}
              style={[styles.dropZone, styles.dropZoneB]}
              onDrop={() =>
                pushEvent({ type: 'drop', demo: 'dropzones', draggableId: 'handle-item', droppableId: 'zone-b' })
              }
            >
              <View testID="droppable-zone-b" style={styles.dropZoneContent}>
                <Text style={styles.zoneLabel}>Zone B</Text>
              </View>
            </Droppable>

            <Droppable
              droppableId="zone-disabled"
              dropDisabled
              style={[styles.dropZone, styles.disabledZone]}
              onDrop={() =>
                pushEvent({
                  type: 'drop',
                  demo: 'dropzones',
                  draggableId: 'disabled-check',
                  droppableId: 'zone-disabled',
                })
              }
              onActiveChange={(isActive) => {
                setZoneDisabledActive(isActive);
                pushEvent({ type: 'active', demo: 'dropzones', droppableId: 'zone-disabled', isActive });
              }}
            >
              <View testID="droppable-zone-disabled" style={styles.dropZoneContent}>
                <Text style={styles.zoneLabel}>Disabled Zone</Text>
                <Text testID="zone-disabled-active" style={styles.zoneMeta}>
                  {String(zoneDisabledActive)}
                </Text>
              </View>
            </Droppable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Handle Only</Text>
          <Draggable
            draggableId="handle-item"
            data={{ id: 'handle-item', label: 'Handle Item' }}
            onDragStart={() =>
              pushEvent({ type: 'drag-start', demo: 'dropzones', draggableId: 'handle-item' })
            }
            onDragEnd={() =>
              pushEvent({ type: 'drag-end', demo: 'dropzones', draggableId: 'handle-item' })
            }
            onStateChange={(state) =>
              pushEvent({ type: 'state', demo: 'dropzones', draggableId: 'handle-item', state })
            }
          >
            <View testID="handle-draggable" style={styles.handleCard}>
              <View testID="handle-draggable-body" style={styles.handleCardBody}>
                <Text style={styles.cardLabel}>Body</Text>
              </View>
              <Draggable.Handle style={styles.handlePill}>
                <View testID="handle-draggable-handle">
                  <Text style={styles.handleText}>Grab</Text>
                </View>
              </Draggable.Handle>
            </View>
          </Draggable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Disabled Drop Target Check</Text>
          <Draggable
            draggableId="disabled-check"
            data={{ id: 'disabled-check', label: 'Disabled Target Check' }}
          >
            <View testID="disabled-target-draggable" style={styles.card}>
              <Text style={styles.cardLabel}>Disabled Target Check</Text>
            </View>
          </Draggable>
        </View>
      </View>
    </DropProvider>
  );
}

export function App(): React.JSX.Element {
  const demo = useMemo(() => getDemoFromPathname(window.location.pathname), []);

  return demo === 'dropzones' ? <DropzonesDemo /> : <BasicDemo />;
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
  },
  card: {
    width: 160,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisCard: {
    width: 120,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCard: {
    opacity: 0.5,
  },
  boundsBox: {
    width: 320,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#111827',
    padding: 12,
    justifyContent: 'center',
  },
  cardLabel: {
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: 14,
  },
  dropArena: {
    position: 'relative' as const,
    width: 420,
    height: 300,
  },
  dropZone: {
    position: 'absolute' as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#132238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneA: {
    top: 16,
    left: 24,
    width: 220,
    height: 150,
  },
  dropZoneB: {
    top: 34,
    left: 52,
    width: 220,
    height: 150,
    backgroundColor: '#1f2937',
  },
  disabledZone: {
    top: 190,
    left: 220,
    width: 170,
    height: 98,
    backgroundColor: '#1f2937',
  },
  activeZone: {
    backgroundColor: '#14532d',
    borderColor: '#22c55e',
  },
  zoneLabel: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 14,
  },
  zoneMeta: {
    color: '#93c5fd',
    marginTop: 6,
    fontSize: 12,
  },
  handleCard: {
    width: 176,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row' as const,
  },
  handleCardBody: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  handlePill: {
    borderRadius: 999,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  handleText: {
    color: '#ecfeff',
    fontWeight: 700,
    fontSize: 12,
  },
};
