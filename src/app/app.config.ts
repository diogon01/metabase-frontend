import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { metabaseAuthInterceptor } from './metabase.service';
import { routes } from './app.routes';
import { ThemeService } from './theming/theme.service';

/**
 * Aplica branding salvo (localStorage) antes do bootstrap. CSS vars já
 * ficam ativas no primeiro render, evitando flicker de cores.
 */
function initTheme(theme: ThemeService) {
  return () => { theme.initialize(); };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideHttpClient(withInterceptors([metabaseAuthInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => import('echarts') } },
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
  ],
};
