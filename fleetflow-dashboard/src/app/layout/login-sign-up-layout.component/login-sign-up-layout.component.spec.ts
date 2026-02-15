import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginSignUpLayoutComponent } from './login-sign-up-layout.component';

describe('LoginSignUpLayoutComponent', () => {
  let component: LoginSignUpLayoutComponent;
  let fixture: ComponentFixture<LoginSignUpLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginSignUpLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginSignUpLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
