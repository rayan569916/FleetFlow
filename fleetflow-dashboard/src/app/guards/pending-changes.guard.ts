import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationDialogService } from '../services/confirmation-dialog.service';

export interface PendingChangesAware {
  canDeactivate: () => boolean | Promise<boolean>;
}

function hasDirtyReactiveForm(component: any): boolean {
  if (!component || typeof component !== 'object') return false;

  return Object.values(component).some((value: any) => {
    if (!value || typeof value !== 'object') return false;
    return typeof value.markAsPristine === 'function' && value.dirty === true;
  });
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesAware | any> = async (component) => {
  if (!component) return true;

  if (typeof component.canDeactivate === 'function') {
    return await component.canDeactivate();
  }

  if (!hasDirtyReactiveForm(component)) {
    return true;
  }

  const confirmationService = inject(ConfirmationDialogService);
  return confirmationService.confirm({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Leave this page and discard them?',
    confirmText: 'Leave',
    cancelText: 'Stay'
  });
};

