import { ZiplineTheme } from '@/lib/theme';
import Root from '../Root';
import ProfileUsername from '../pages/profile/[username]';
import { Config } from '@/lib/config/validate';

export const createRoutes = (themes?: ZiplineTheme[], defaultTheme?: Config['website']['theme']) => [
  {
    path: '/profile',
    Component:
      typeof window === 'undefined' ? undefined : () => <Root themes={themes} defaultTheme={defaultTheme} />,
    children: [
      {
        path: ':username',
        Component: () => <ProfileUsername />,
      },
    ],
  },
];
