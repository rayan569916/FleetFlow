import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankApprovals } from './bank-approvals';

describe('BankApprovals', () => {
  let component: BankApprovals;
  let fixture: ComponentFixture<BankApprovals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankApprovals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankApprovals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
