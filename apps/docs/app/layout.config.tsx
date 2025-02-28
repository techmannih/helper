import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <Image src="/logo-white.svg" alt="Helper" width={90} height={22} className="hidden dark:block" />
        <Image src="/logo.svg" alt="Helper" width={90} height={22} className="block dark:hidden" />
      </>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/',
      active: 'nested-url',
    },
  ],
};
