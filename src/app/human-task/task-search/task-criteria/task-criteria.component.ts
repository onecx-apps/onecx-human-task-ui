import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'

import { Action, AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { TaskSearchCriteria } from 'src/app/shared/generated'

export interface TaskCriteriaForm {
  title: FormControl<string | null>
  providerTaskId: FormControl<string | null>
}

@Component({
  selector: 'app-task-criteria',
  imports: [
    AngularAcceleratorModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    TranslateModule,
    TooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-criteria.component.html',
  styleUrl: './task-criteria.component.scss'
})
export class TaskCriteriaComponent {
  @Input() public actions: Action[] = []
  @Output() public searchEmitter = new EventEmitter<TaskSearchCriteria>()
  @Output() public resetSearchEmitter = new EventEmitter<boolean>()

  public readonly criteriaForm: FormGroup<TaskCriteriaForm> = new FormGroup<TaskCriteriaForm>({
    title: new FormControl<string | null>(null),
    providerTaskId: new FormControl<string | null>(null)
  })

  public onSearch(): void {
    this.searchEmitter.emit({
      title: this.criteriaForm.controls.title.value || undefined,
      providerTaskId: this.criteriaForm.controls.providerTaskId.value || undefined
    })
  }

  public onResetCriteria(): void {
    this.criteriaForm.reset()
    this.resetSearchEmitter.emit(true)
  }
}
