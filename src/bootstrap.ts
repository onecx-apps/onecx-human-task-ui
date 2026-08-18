import { bootstrapModule } from '@onecx/angular-webcomponents'

import { environment } from 'src/environments/environment'
import { OneCXHumanTaskModule } from './app/onecx-human-task-remote.module'

bootstrapModule(OneCXHumanTaskModule, 'microfrontend', environment.production)
