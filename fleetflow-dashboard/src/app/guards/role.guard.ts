import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: string[] = route.data?.['roles'] || [];
  const currentRole = authService.currentUserRole();

  if (!currentRole) {
    router.navigate(['/login']);
    return false;
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(currentRole)) {
    return true;
  }

  // If driver tries to access a non-allowed route, redirect to driver-ui
  if (currentRole === 'driver') {
    router.navigate(['/dashboard/driver-ui']);
    return false;
  }

  // Otherwise redirect to overview
  router.navigate(['/dashboard/overview']);
  return false;
};
