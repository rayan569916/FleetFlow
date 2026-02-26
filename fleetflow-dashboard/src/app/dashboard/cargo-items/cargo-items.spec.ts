import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargoItems } from './cargo-items';

describe('CargoItems', () => {
  let component: CargoItems;
  let fixture: ComponentFixture<CargoItems>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargoItems]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargoItems);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
