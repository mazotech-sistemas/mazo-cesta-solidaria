import * as React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

const Icon = ({ className = '', size = 20 }: IconProps & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
