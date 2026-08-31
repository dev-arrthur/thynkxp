import type { SVGProps } from 'react';

export type IconName =
  | 'activity' | 'arrow-right' | 'arrow-up-right' | 'bar-chart' | 'bell' | 'briefcase'
  | 'calendar' | 'check' | 'check-circle' | 'chevron-right' | 'clock' | 'code'
  | 'credit-card' | 'download' | 'external-link' | 'file' | 'filter' | 'folder'
  | 'globe' | 'home' | 'instagram' | 'layers' | 'location' | 'lock' | 'logout' | 'mail'
  | 'megaphone' | 'menu' | 'message-square' | 'monitor' | 'pen-tool' | 'phone'
  | 'receipt' | 'rocket' | 'search' | 'server' | 'settings' | 'shield' | 'shopping-cart'
  | 'signature' | 'sparkles' | 'ticket' | 'trending-up' | 'users' | 'whatsapp'
  | 'workflow' | 'x' | 'zap';

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export default function Icon({ name, size = 20, ...props }: Props) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true, ...props,
  };

  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2.2-6 4.2 12 2.4-6H21" />,
    'arrow-right': <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    'arrow-up-right': <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    'bar-chart': <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V8" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    code: <><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m14 5-4 14" /></>,
    'credit-card': <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    'external-link': <><path d="M14 5h5v5" /><path d="M10 14 19 5" /><path d="M19 13v6H5V5h6" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
    filter: <><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></>,
    folder: <path d="M3 6h7l2 2h9v11H3z" />,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18" /><path d="M12 3c-3 3-3 15 0 18" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    logout: <><path d="M10 5H5v14h5" /><path d="M13 8l4 4-4 4" /><path d="M17 12H9" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    megaphone: <><path d="m3 11 14-6v14L3 13z" /><path d="M7 14v5h4l1-4" /><path d="M20 9v6" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    'message-square': <path d="M5 5h14v11H9l-4 4z" />,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    'pen-tool': <><path d="m12 3 7 7-7 11-7-11z" /><path d="M12 3v9" /><circle cx="12" cy="13" r="1" /></>,
    phone: <path d="M8 3H5a2 2 0 0 0-2 2c0 8.8 7.2 16 16 16a2 2 0 0 0 2-2v-3l-4-1-2 3c-4-1-7-4-8-8l3-2z" />,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    rocket: <><path d="M14 4c3-2 6-1 6-1s1 3-1 6l-6 6-4-4z" /><path d="m9 11-4 1-2 3 6 1" /><path d="m13 15 1 6 3-2 1-4" /><circle cx="16" cy="7" r="1.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    server: <><rect x="4" y="4" width="16" height="6" rx="2" /><rect x="4" y="14" width="16" height="6" rx="2" /><path d="M8 7h.01M8 17h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    'shopping-cart': <><path d="M3 4h2l2 11h10l3-7H7" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
    signature: <><path d="M3 17c3-5 5-8 7-8 3 0-1 8 2 8 2 0 3-4 5-4 2 0 1 4 4 4" /><path d="M3 21h18" /></>,
    sparkles: <><path d="m12 3 1.2 3.4L16.5 8l-3.3 1.4L12 13l-1.2-3.6L7.5 8l3.3-1.6z" /><path d="m18.5 13 .8 2.2 2.2.8-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.8z" /><path d="m5 14 .7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7z" /></>,
    ticket: <><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z" /><path d="M12 7v12" /></>,
    'trending-up': <><path d="m4 17 6-6 4 4 6-8" /><path d="M15 7h5v5" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6" /><circle cx="17" cy="9" r="2" /><path d="M16 15c3 0 5 1.5 5 5" /></>,
    whatsapp: <><path d="M20 11.5A8.5 8.5 0 0 1 7.4 19L3 20l1.1-4.1A8.5 8.5 0 1 1 20 11.5Z" /><path d="M8.2 8.4c.4 3 3 5.6 6 6 .8.1 1.8-1.3 1.9-1.7-.9-.5-1.8-1-2.2-1.1-.4.5-.7 1.1-1.1 1-1.4-.5-2.9-2-3.4-3.4-.1-.4.5-.7 1-1.1-.1-.4-.6-1.3-1.1-2.2-.4.1-1.8 1.1-1.7 1.9" /></>,
    workflow: <><rect x="3" y="4" width="6" height="5" rx="1" /><rect x="15" y="15" width="6" height="5" rx="1" /><path d="M9 6.5h3a3 3 0 0 1 3 3V15" /><path d="m12 13 3 3 3-3" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    zap: <path d="M13 2 5 14h7l-1 8 8-12h-7z" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
