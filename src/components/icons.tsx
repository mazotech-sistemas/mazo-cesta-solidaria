import * as React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

const Icon = ({ className = '', size = 20, children, ...rest }: IconProps & React.SVGProps<SVGSVGElement>) => (
  <svg
    width={size}
    height={size}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const PackageIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </Icon>
);

export const AlertTriangleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const ShoppingCartIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </Icon>
);

export const GrainIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <path d="m7 7 10 10" />
    <path d="m17 7-10 10" />
  </Icon>
);

export const BeanIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 2v8c0 3.31 2.69 6 6 6s6-2.69 6-6V2" />
    <path d="M8 22v-8c0-3.31 2.69-6 6-6s6 2.69 6 6v8" />
  </Icon>
);

export const MilkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 10a4 4 0 1 0 8 0v-4h4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v2zm2 4h8" />
    <path d="M10 14v4a2 2 0 0 0 2 2h0c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2h0a2 2 0 0 0 2-2v-4" />
  </Icon>
);

export const OilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2v8a6 6 0 0 0 6 6h0a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6h0a6 6 0 0 0 6-6V2" />
    <path d="M12 12v8" />
  </Icon>
);

export const WheatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <path d="m6 6 12 12" />
  </Icon>
);

export const ChefHatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 13h12l-2 9H8l-2-9z" />
    <path d="M2 13h20" />
    <path d="M5 13V6a5 5 0 0 1 10 0v7" />
  </Icon>
);

export const PackageFallbackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7 12 12l8.7-5" />
  </Icon>
);

export const DashboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icon>
);

export const CalculatorIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8" />
    <path d="M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 19h1M12 19h1M16 19h1" />
  </Icon>
);

export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </Icon>
);

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.4.5.7.94.83" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const LogOutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17 16l4-4-4-4" />
    <path d="M21 12H9" />
    <path d="M13 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </Icon>
);

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 17V5" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 21h14" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m20 6-11 11-5-5" />
  </Icon>
);

export const BasketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 11V7a4 4 0 0 0-8 0v4" />
    <path d="M5 9h14l1 12H4L5 9Z" />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);
