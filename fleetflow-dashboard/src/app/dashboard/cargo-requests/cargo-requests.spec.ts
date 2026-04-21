import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargoRequests } from './cargo-requests';

describe('CargoRequests', () => {
  let component: CargoRequests;
  let fixture: ComponentFixture<CargoRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargoRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargoRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
