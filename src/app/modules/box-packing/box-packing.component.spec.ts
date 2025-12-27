import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPackingComponent } from './box-packing.component';

describe('BoxPackingComponent', () => {
  let component: BoxPackingComponent;
  let fixture: ComponentFixture<BoxPackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPackingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxPackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
