import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentScanComponent } from './component-scan.component';

describe('ComponentScanComponent', () => {
  let component: ComponentScanComponent;
  let fixture: ComponentFixture<ComponentScanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ComponentScanComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentScanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
