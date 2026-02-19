import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Auto logout if 401 response returned from api
                console.warn('Unauthorized request intercepted. Logging out.');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_role');
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
