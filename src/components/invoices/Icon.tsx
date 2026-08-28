// src/components/invoices/Icon.tsx
export default function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    download: (<><path d="M12 3v12M7 10l5 5 5-5" {...p} /><path d="M5 21h14" {...p} /></>),
    trash:    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...p} />,
    search:   (<><circle cx="11" cy="11" r="7" {...p} /><path d="m21 21-4.3-4.3" {...p} /></>),
    refresh:  <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    receipt:  <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h4" {...p} />,
    csv:      (<><path d="M14 3v5h5" {...p} /><path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" {...p} /><path d="M9 13h6M9 17h4" {...p} /></>),
    banknote: (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /><path d="M6 12h.01M18 12h.01" {...p} /></>),
    card:     (<><rect x="2.5" y="5" width="19" height="14" rx="2" {...p} /><path d="M2.5 9.5h19" {...p} /></>),
    coins:    (<><ellipse cx="9" cy="6.5" rx="5.5" ry="2.8" {...p} /><path d="M3.5 6.5v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4" {...p} /><path d="M9 13.3v3.9c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4" {...p} /></>),
    lock:     (<><rect x="5" y="11" width="14" height="10" rx="2" {...p} /><path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} /></>),
    edit:     (<><path d="M12 20h9" {...p} /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" {...p} /></>),
    plus:     <path d="M12 5v14M5 12h14" {...p} />,
    x:        <path d="M18 6 6 18M6 6l12 12" {...p} />,
    mail:     <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5" {...p} />,
    user:     (<><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" {...p} /></>),
    phone:    <path d="M6.5 3.5c.5 0 .9.3 1.1.8l1 2.4c.2.5.1 1-.3 1.4L8 9.5c1 2 2.5 3.5 4.5 4.5l1.4-1.3c.4-.4.9-.5 1.4-.3l2.4 1c.5.2.8.6.8 1.1v3c0 .7-.6 1.3-1.3 1.2C10.5 18 6 13.5 5.3 6.8 5.2 6.1 5.8 5.5 6.5 5.5z" fill="currentColor" stroke="none" />,
    cash:     (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /></>),
    whatsapp: (<><path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p} /><path d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z" fill="currentColor" stroke="none" /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>;
}