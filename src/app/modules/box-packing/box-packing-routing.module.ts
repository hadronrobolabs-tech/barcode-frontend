import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BoxPackingComponent } from './box-packing.component';

const routes: Routes = [
    {path:'',component:BoxPackingComponent}

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BoxPackingRoutingModule { }
