import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/index.scss';
import { ensureRuntimeConfig } from '@/runtimeConfigLoader';

const bootstrapApplication = async (): Promise<void> => {
  await ensureRuntimeConfig();

  const [
    { default: App },
    { queryClient },
    { default: AnnouncerProvider },
    { AuthProvider },
    { default: NotificationProvider },
    { default: PageTitleProvider },
    { PreferenceProvider },
    { default: ThemeProvider },
    { migrateOldServiceWorker },
  ] = await Promise.all([
    import('@/App.tsx'),
    import('@/config/react-query/config'),
    import('@/context/announcer/AnnouncerProvider'),
    import('@/context/auth/AuthProvider'),
    import('@/context/notification/NotificationProvider'),
    import('@/context/pageTitle/PageTitleProvider'),
    import('@/context/preference/PreferenceProvider.tsx'),
    import('@/context/theme/ThemeProvider.tsx'),
    import('@/registerServiceWorker'),
  ]);

  migrateOldServiceWorker();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AnnouncerProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <PreferenceProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <PageTitleProvider>
                    <App />
                  </PageTitleProvider>
                </NotificationProvider>
              </ThemeProvider>
            </PreferenceProvider>
          </QueryClientProvider>
        </AuthProvider>
      </AnnouncerProvider>
    </StrictMode>,
  );
};

void bootstrapApplication();