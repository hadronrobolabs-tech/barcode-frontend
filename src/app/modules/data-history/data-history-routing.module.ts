import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DataHistoryComponent } from './data-history.component';

const routes: Routes = [
    {path:'',component:DataHistoryComponent}

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataHistoryRoutingModule { }
