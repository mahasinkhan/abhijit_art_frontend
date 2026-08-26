// src/components/inventory/Icon.tsx
// ── Single icon component used across inventory sub-components ────────────

const ICONS: Record<string,(p:any)=>JSX.Element> = {
  search:   p=><><circle cx="11" cy="11" r="7" {...p}/><path d="m21 21-4.35-4.35" {...p}/></>,
  plus:     p=><path d="M12 5v14M5 12h14" {...p}/>,
  edit:     p=><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...p}/>,
  trash:    p=><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...p}/>,
  move:     p=><path d="M5 12h14M12 5l7 7-7 7" {...p}/>,
  history:  p=><><path d="M3 3v5h5" {...p}/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" {...p}/><path d="M12 7v5l4 2" {...p}/></>,
  box:      p=><><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" {...p}/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" {...p}/></>,
  download: p=><><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p}/><polyline points="7 10 12 15 17 10" {...p}/><line x1="12" y1="15" x2="12" y2="3" {...p}/></>,
  warning:  p=><><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...p}/><line x1="12" y1="9" x2="12" y2="13" {...p}/><line x1="12" y1="17" x2="12.01" y2="17" {...p}/></>,
  x:        p=><path d="M18 6 6 18M6 6l12 12" {...p}/>,
  lock:     p=><><rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...p}/><path d="M7 11V7a5 5 0 0 1 10 0v4" {...p}/></>,
  users:    p=><><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p}/><circle cx="9" cy="7" r="4" {...p}/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...p}/></>,
  chevron:  p=><path d="m9 18 6-6-6-6" {...p}/>,
};

interface Props { name: string; size?: number; color?: string; }

export default function Icon({ name, size=16, color="currentColor" }: Props) {
  const p = { fill:"none", stroke:color, strokeWidth:1.7, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  const fn = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0}} aria-hidden>
      {fn ? fn(p) : null}
    </svg>
  );
}