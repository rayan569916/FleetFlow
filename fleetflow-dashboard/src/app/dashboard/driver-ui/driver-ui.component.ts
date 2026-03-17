import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileNavComponent } from '../../shared/ui/mobile-nav/mobile-nav.component';
import { PendingChangesAware } from '../../guards/pending-changes.guard';
import { TotalCargoCardComponent } from '../total-cargo-card.component/total-cargo-card.component';


@Component({
    selector: 'app-driver-ui',
    standalone: true,
    imports: [CommonModule, RouterModule, MobileNavComponent, TotalCargoCardComponent],
    templateUrl: './driver-ui.component.html'
})
export class DriverUiComponent implements PendingChangesAware {
    canDeactivate(): boolean {
        // Driver UI is just a menu, no unsaved changes possible here by itself.
        // It implements the interface so the guard can be applied if it ever gets forms in the future.
        return true;
    }
}
