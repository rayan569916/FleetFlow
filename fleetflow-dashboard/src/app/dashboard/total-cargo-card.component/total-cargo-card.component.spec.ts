import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalCargoCardComponent } from './total-cargo-card.component';

describe('TotalCargoCardComponent', () => {
  let component: TotalCargoCardComponent;
  let fixture: ComponentFixture<TotalCargoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalCargoCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalCargoCardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
