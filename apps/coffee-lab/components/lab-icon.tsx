import type { SVGProps } from 'react';

type Icon = 'home' | 'cupping' | 'brew' | 'collection' | 'lab' | 'activity' | 'cafe';

const shapes: Record<Icon, React.ReactNode> = {
 home: <><path d="m3.5 10 8.5-7 8.5 7M5.5 9v11h13V9M10 20v-6h4v6"/></>,
 cupping: <><path d="M3 12h12a6 6 0 0 1-12 0Zm3 8h6M14 9l3-4"/><ellipse cx="18.2" cy="4.7" rx="2.2" ry="3" transform="rotate(35 18.2 4.7)"/></>,
 brew: <><path d="M4 5h16l-4 8H8L4 5ZM12 13v3m-5 4h10m-9-14 2 5m2-5v5m3-5-2 5"/></>,
 collection: <><path d="M7 4h10l3 5v10l-2 2H6l-2-2V9l3-5Zm0 4h10"/><ellipse cx="12" cy="14.5" rx="3" ry="4" transform="rotate(35 12 14.5)"/><path d="M13.8 11.3c-2.5.7-1.2 4.2-3.6 6.4"/></>,
 lab: <><path d="M8 3h8m-6 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3m-6 11h8"/><circle cx="10" cy="17.2" r=".65" fill="currentColor" stroke="none"/><circle cx="14" cy="18" r=".85" fill="currentColor" stroke="none"/></>,
 activity: <><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M3 9h18m-13-7v4m8-4v4m-10 9h3l2-3 2 5 2-2h3"/></>,
 cafe: <><path d="m3 9 2-5h14l2 5m-18 0v2a3 3 0 0 0 4.5 2.6A3 3 0 0 0 12 13a3 3 0 0 0 4.5.6A3 3 0 0 0 21 11V9H3Zm2 5v6h14v-6m-9 6v-4h4v4"/></>,
};

export function LabIcon({ name, ...props }: { name: Icon } & SVGProps<SVGSVGElement>) {
 return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{shapes[name]}</svg>;
}
