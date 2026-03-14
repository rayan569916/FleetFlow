import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { SwPush } from "@angular/service-worker";
import { Subject } from "rxjs";
import { environment } from '../../environments/environment';


@Injectable({
    providedIn:'root'
})
export class PushNotificationService {
    private apiRoot = environment.apiBaseUrl.startsWith('http') 
        ? environment.apiBaseUrl 
        : `${window.location.origin}${environment.apiBaseUrl}`;

    readonly VAPID_PUBLIC_KEY = environment.vapidPublicKey;

    private swPush = inject(SwPush);
    private http = inject(HttpClient);
    private router = inject(Router);

    private notificationClicksSource = new Subject<{ action: string; notification: any }>();
    notificationClicks$ = this.notificationClicksSource.asObservable();

    constructor() {
        this.swPush.notificationClicks.subscribe(({ action, notification }) => {
            console.log('Notification clicked', action, notification);
            this.notificationClicksSource.next({ action, notification });
            const data = (notification as any).data;
            if (data && data.url) {
                this.router.navigateByUrl(data.url);
            }
        });
    }

    subscribe() {
        if (!this.swPush.isEnabled) {
            console.warn('Push notifications are not enabled');
            return;
        }

        this.swPush.requestSubscription({
            serverPublicKey: this.VAPID_PUBLIC_KEY
        })
        .then(sub => {
            this.http.post(`${this.apiRoot}/auth/save-subscription`, sub).subscribe({
                next: () => console.log('Successfully subscribed to push notifications'),
                error: (err) => console.error('Error saving push subscription', err)
            });
        })
        .catch(err => console.error('Error requesting push subscription', err));
    }
}