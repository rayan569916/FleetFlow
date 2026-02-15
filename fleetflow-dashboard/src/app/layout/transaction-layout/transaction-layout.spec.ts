import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionLayout } from './transaction-layout';

describe('TransactionLayout', () => {
  let component: TransactionLayout;
  let fixture: ComponentFixture<TransactionLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
