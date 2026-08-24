import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { PortalApiConfiguration, providePermissionService } from '@onecx/angular-utils'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'

import { Configuration } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'
import { TaskSearchComponent } from './task-search/task-search.component'

function apiConfigProvider() {
  return new PortalApiConfiguration(Configuration, environment.apiPrefix)
}

const routes: Routes = [
  {
    path: '',
    component: TaskSearchComponent,
    pathMatch: 'full'
  }
]

@NgModule({
  declarations: [],
  imports: [TaskSearchComponent, RouterModule.forChild(routes)],
  providers: [
    ...providePermissionService(),
    { provide: Configuration, useFactory: apiConfigProvider, deps: [ConfigurationService, AppStateService] }
  ]
})
export class HumanTaskModule {}
