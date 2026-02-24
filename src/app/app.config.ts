import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { LucideAngularModule, Search, Check, RefreshCw, Filter, User, Lock, Eye, EyeOff, Plane, Clock, AlertTriangle, ChevronDown, LogOut, Home, Settings, ChevronLeft, ChevronRight, X, MapPin, Monitor, LogIn } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(LucideAngularModule.pick({
      Search, Check, RefreshCw, Filter, User, Lock, Eye, EyeOff, Plane,
      Clock, AlertTriangle, ChevronDown, LogOut, Home, Settings,
      ChevronLeft, ChevronRight, X, MapPin, Monitor, LogIn
    }))
  ]
};
