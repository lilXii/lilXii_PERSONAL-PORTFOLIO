import { brand, text as t, type Localized } from './content';
import { media } from './media';

export type OrganizationLogo = {
  src: string; width: number; height: number; alt: Localized; dark?: boolean;
};

export const organizationLogos = {
  itri: { src: 'images/logos/itri.webp', width: 512, height: 119, alt: t('ITRI logo', '工業技術研究院標誌') },
  auo: { src: 'images/logos/auo.webp', width: 512, height: 179, alt: t('AUO logo', '友達光電標誌') },
  openhci2025: { src: 'images/logos/openhci-2025.webp', width: 512, height: 156, alt: t('OpenHCI 2025 logo', 'OpenHCI 2025 標誌') },
  openhci2026: { src: 'images/logos/openhci-2026.webp', width: 447, height: 447, alt: t('OpenHCI 2026 artwork', 'OpenHCI 2026 主視覺') },
  cyclist: { src: 'images/logos/taiwan-cyclist-federation.webp', width: 447, height: 447, alt: t('Taiwan Cyclist Federation logo', '中華民國自行車騎士協會標誌') },
  nycu: { src: media['02'].thumbnail, width: media['02'].width, height: media['02'].height, alt: media['02'].alt },
  personal: { src: brand.icon, width: 64, height: 64, alt: t('lilXii LX logo', 'lilXii LX 標誌'), dark: true },
} satisfies Record<string, OrganizationLogo>;
