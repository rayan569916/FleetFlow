import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-mobile-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './mobile-nav.component.html',
    styleUrl: './mobile-nav.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavComponent {
    currentRoute: string = '';

    constructor(private router: Router, private location: Location) {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentRoute = event.urlAfterRedirects;
        });
        this.currentRoute = this.router.url;
    }

    goBack() {
        this.location.back();
    }

    isActive(route: string): boolean {
        return this.currentRoute.includes(route);
    }
}
