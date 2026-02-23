import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitPrice } from './unit-price';

describe('UnitPrice', () => {
  let component: UnitPrice;
  let fixture: ComponentFixture<UnitPrice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitPrice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitPrice);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
