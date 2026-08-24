import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core'
import { finalize } from 'rxjs'
import { TranslateModule } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { TagModule } from 'primeng/tag'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Task, TasksInternalAPIService } from 'src/app/shared/generated'

export type TaskActionType = 'accept' | 'decline' | 'delete'

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [ButtonModule, DialogModule, InputTextModule, MessageModule, TagModule, TooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss'
})
export class TaskDetailComponent implements OnChanges {
  @Input() public displayDialog = false
  @Input() public taskItem: Task | undefined
  @Input() public requestedAction: TaskActionType = 'accept'
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  public loading = false
  public exceptionKey: string | undefined
  public taskData: Task | undefined
  public customInputEntries: Array<{ key: string; value: string }> = []

  private readonly taskApi = inject(TasksInternalAPIService)
  private readonly msgService = inject(PortalMessageService)

  public ngOnChanges(): void {
    if (!this.displayDialog) return
    this.exceptionKey = undefined
    this.taskData = undefined
    this.customInputEntries = []
    this.getData(this.taskItem?.id)
  }

  public onDialogHide(changed?: boolean): void {
    this.hideDialogAndChanged.emit(changed ?? false)
    this.taskData = undefined
    this.customInputEntries = []
    this.exceptionKey = undefined
  }

  public onAccept(): void {
    const task = this.taskData
    if (!task?.id) return

    this.taskApi
      .acceptTask({
        id: task.id,
        acceptTaskRequest: {
          modificationCount: task.modificationCount ?? 0,
          input: this.buildCustomInputPayload()
        }
      })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.ACCEPT.MESSAGE.OK' })
          this.onDialogHide(true)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.ACCEPT.MESSAGE.NOK' })
          console.error('acceptTask', err)
        }
      })
  }

  public onDecline(): void {
    const task = this.taskData
    if (!task?.id) return

    this.taskApi
      .declineTask({
        id: task.id,
        declineTaskRequest: {
          modificationCount: task.modificationCount ?? 0,
          input: this.buildCustomInputPayload()
        }
      })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DECLINE.MESSAGE.OK' })
          this.onDialogHide(true)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DECLINE.MESSAGE.NOK' })
          console.error('declineTask', err)
        }
      })
  }

  public onDelete(): void {
    const task = this.taskData
    if (!task?.id) return

    this.taskApi.deleteTaskById({ id: task.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        this.onDialogHide(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        console.error('deleteTaskById', err)
      }
    })
  }

  public onRequestedAction(): void {
    switch (this.requestedAction) {
      case 'decline': {
        this.onDecline()
        break
      }
      case 'delete': {
        this.onDelete()
        break
      }
      default: {
        this.onAccept()
      }
    }
  }

  public getRequestedActionHeaderKey(): string {
    switch (this.requestedAction) {
      case 'decline': {
        return 'ACTIONS.DECLINE.HEADER'
      }
      case 'delete': {
        return 'ACTIONS.DELETE.HEADER'
      }
      default: {
        return 'ACTIONS.ACCEPT.HEADER'
      }
    }
  }

  public getRequestedActionTextKey(): string {
    switch (this.requestedAction) {
      case 'decline': {
        return 'ACTIONS.DECLINE.TEXT'
      }
      case 'delete': {
        return 'ACTIONS.DELETE.TEXT'
      }
      default: {
        return 'ACTIONS.ACCEPT.TEXT'
      }
    }
  }

  public getRequestedActionButtonLabelKey(): string {
    switch (this.requestedAction) {
      case 'decline': {
        return 'ACTIONS.DECLINE.LABEL'
      }
      case 'delete': {
        return 'ACTIONS.DELETE.LABEL'
      }
      default: {
        return 'ACTIONS.ACCEPT.LABEL'
      }
    }
  }

  public getRequestedActionButtonSeverity(): 'primary' | 'warn' | 'danger' {
    switch (this.requestedAction) {
      case 'decline': {
        return 'primary'
      }
      case 'delete': {
        return 'danger'
      }
      default: {
        return 'primary'
      }
    }
  }

  public getRequestedActionButtonIcon(): string {
    switch (this.requestedAction) {
      case 'decline': {
        return 'pi pi-times text-red-600'
      }
      case 'delete': {
        return 'pi pi-trash'
      }
      default: {
        return 'pi pi-check text-green-600'
      }
    }
  }

  public isInputAction(): boolean {
    return this.requestedAction === 'accept' || this.requestedAction === 'decline'
  }

  public addCustomInputEntry(): void {
    this.customInputEntries = [...this.customInputEntries, { key: '', value: '' }]
  }

  public removeCustomInputEntry(index: number): void {
    this.customInputEntries = this.customInputEntries.filter((_, entryIndex) => entryIndex !== index)
  }

  public updateCustomInputKey(index: number, key: string): void {
    this.customInputEntries = this.customInputEntries.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, key } : entry
    )
  }

  public updateCustomInputValue(index: number, value: string): void {
    this.customInputEntries = this.customInputEntries.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, value } : entry
    )
  }

  private buildCustomInputPayload(): Record<string, string> | undefined {
    const entries = this.customInputEntries
      .map((entry) => ({ key: entry.key.trim(), value: entry.value.trim() }))
      .filter((entry) => entry.key !== '')

    if (entries.length === 0) {
      return undefined
    }

    return entries.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.key] = entry.value
      return acc
    }, {})
  }

  private getData(id?: string): void {
    if (!id) return

    this.loading = true
    this.exceptionKey = undefined
    this.taskApi
      .getTaskById({ id })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.taskData = data.resource
          if (this.isInputAction() && this.customInputEntries.length === 0) {
            this.customInputEntries = [{ key: '', value: '' }]
          }
        },
        error: (err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.TASK_ITEM'
          this.msgService.error({ summaryKey: this.exceptionKey })
          console.error('getTaskById', err)
        }
      })
  }
}
