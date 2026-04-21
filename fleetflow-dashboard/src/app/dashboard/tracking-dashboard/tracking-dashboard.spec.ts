import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackingDashboard } from './tracking-dashboard';

describe('TrackingDashboard', () => {
  let component: TrackingDashboard;
  let fixture: ComponentFixture<TrackingDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackingDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackingDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
