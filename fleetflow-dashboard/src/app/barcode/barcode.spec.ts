import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Barcode } from './barcode';

describe('Barcode', () => {
  let component: Barcode;
  let fixture: ComponentFixture<Barcode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Barcode]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Barcode);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
