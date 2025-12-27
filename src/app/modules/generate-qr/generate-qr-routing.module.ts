import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GenerateBarcodeComponent } from './generate-qr.component';

const routes: Routes = [

  {path:'',component:GenerateBarcodeComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GenerateQrRoutingModule { }
