import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentScanComponent } from './component-scan.component';

const routes: Routes = [
  {
    path: '',
    component: ComponentScanComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComponentScanRoutingModule {}
