import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { GetTaskResponse, Task, TasksInternalAPIService } from 'src/app/shared/generated'
import { TaskDetailComponent } from './task-detail.component'

const taskItem: Task = {
  id: 'id',
  title: 'Task title',
  providerTaskId: 'provider-id',
  status: 'CREATED' as any,
  providerType: 'CAMUNDA' as any,
  modificationCount: 3
}

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent
  let fixture: ComponentFixture<TaskDetailComponent>

  const defaultLang = 'en'
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getTaskById: jasmine.createSpy('getTaskById').and.returnValue(of({ resource: taskItem } as GetTaskResponse)),
    acceptTask: jasmine.createSpy('acceptTask').and.returnValue(of({})),
    declineTask: jasmine.createSpy('declineTask').and.returnValue(of({})),
    deleteTaskById: jasmine.createSpy('deleteTaskById').and.returnValue(of({}))
  }

  function initTestComponent() {
    fixture = TestBed.createComponent(TaskDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TaskDetailComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage(defaultLang)
      ],
      providers: [provideNoopAnimations()]
    })
      .overrideComponent(TaskDetailComponent, {
        add: {
          providers: [
            { provide: TasksInternalAPIService, useValue: apiServiceSpy },
            { provide: PortalMessageService, useValue: msgServiceSpy }
          ]
        }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  afterEach(() => {
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getTaskById.calls.reset()
    apiServiceSpy.getTaskById.and.returnValue(of({ resource: taskItem } as GetTaskResponse))
    apiServiceSpy.acceptTask.calls.reset()
    apiServiceSpy.acceptTask.and.returnValue(of({}))
    apiServiceSpy.declineTask.calls.reset()
    apiServiceSpy.declineTask.and.returnValue(of({}))
    apiServiceSpy.deleteTaskById.calls.reset()
    apiServiceSpy.deleteTaskById.and.returnValue(of({}))
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should use selected task data without refetching when opening accept mode', () => {
    component.displayDialog = true
    component.taskItem = taskItem
    component.requestedAction = 'accept'

    component.ngOnChanges()

    expect(apiServiceSpy.getTaskById).not.toHaveBeenCalled()
    expect(component.taskData).toBe(taskItem)
    expect(component.customInputEntries).toEqual([{ key: '', value: '' }])
  })

  it('should use selected task data without refetching when opening decline mode', () => {
    component.displayDialog = true
    component.taskItem = taskItem
    component.requestedAction = 'decline'

    component.ngOnChanges()

    expect(apiServiceSpy.getTaskById).not.toHaveBeenCalled()
    expect(component.taskData).toBe(taskItem)
    expect(component.customInputEntries).toEqual([{ key: '', value: '' }])
  })

  it('should use selected task data without refetching when opening view mode', () => {
    component.displayDialog = true
    component.taskItem = taskItem
    component.requestedAction = 'view'

    component.ngOnChanges()

    expect(apiServiceSpy.getTaskById).not.toHaveBeenCalled()
    expect(component.taskData).toBe(taskItem)
  })

  it('should return empty custom input text when task data is unavailable', () => {
    component.taskData = undefined

    expect(component.getCustomInputText()).toBe('')
  })

  it('should return empty custom input text when task has no custom input', () => {
    component.taskData = taskItem

    expect(component.getCustomInputText()).toBe('')
  })

  it('should assign a severity to each task status', () => {
    expect(component.getStatusSeverity('ACCEPTED')).toBe('success')
    expect(component.getStatusSeverity('CREATED')).toBe('info')
    expect(component.getStatusSeverity('DECLINED')).toBe('danger')
    expect(component.getStatusSeverity('UNKNOWN')).toBe('warn')
  })

  it('should format persisted custom input as formatted JSON for display', () => {
    component.taskData = { ...taskItem, customInput: { decision: 'approved', reviewer: 'operations' } }

    expect(component.getCustomInputText()).toBe('{\n  "decision": "approved",\n  "reviewer": "operations"\n}')
  })

  it('should format persisted custom input when BFF returns it as a JSON string', () => {
    component.taskData = { ...taskItem, customInput: '{"decision":"approved","reviewer":"operations"}' as any }

    expect(component.getCustomInputText()).toBe('{\n  "decision": "approved",\n  "reviewer": "operations"\n}')
  })

  it('should display serialized custom input when BFF returns invalid JSON', () => {
    component.taskData = { ...taskItem, customInput: 'unstructured input' as any }

    expect(component.getCustomInputText()).toBe('unstructured input')
  })

  it('should return empty custom input text when BFF returns null', () => {
    component.taskData = { ...taskItem, customInput: null as any }

    expect(component.getCustomInputText()).toBe('')
  })

  it('should display an empty persisted custom input object as JSON', () => {
    component.taskData = { ...taskItem, customInput: {} }

    expect(component.getCustomInputText()).toBe('{}')
  })

  it('should format persisted custom input when BFF uses different property casing', () => {
    component.taskData = { ...taskItem, CustomInput: { decision: 'approved' } } as Task

    expect(component.getCustomInputText()).toBe('{\n  "decision": "approved"\n}')
  })

  it('should format persisted custom input when BFF flattens it into task properties', () => {
    component.taskData = { ...taskItem, 'customInput.ocx-key-1': 'ocx-val1' } as Task

    expect(component.getCustomInputText()).toBe('{\n  "ocx-key-1": "ocx-val1"\n}')
  })

  it('should not load task details when dialog is closed', () => {
    component.displayDialog = false
    component.taskItem = taskItem

    component.ngOnChanges()

    expect(apiServiceSpy.getTaskById).not.toHaveBeenCalled()
  })

  it('should not load details when task id is missing', () => {
    component.displayDialog = true
    component.taskItem = { ...taskItem, id: undefined }
    component.requestedAction = 'delete'

    component.ngOnChanges()

    expect(apiServiceSpy.getTaskById).not.toHaveBeenCalled()
  })

  it('should expose exception key when loading details fails', () => {
    const errorResponse = { status: 404, statusText: 'Not found' }
    apiServiceSpy.getTaskById.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    component.displayDialog = true
    component.taskItem = taskItem
    component.requestedAction = 'delete'

    component.ngOnChanges()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.TASK_ITEM')
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_404.TASK_ITEM' })
    expect(console.error).toHaveBeenCalledWith('getTaskById', errorResponse)
  })

  it('should accept a task and close dialog on success', () => {
    component.taskData = taskItem
    component.customInputEntries = [{ key: 'decision', value: 'approved' }]
    const callOrder: string[] = []
    const emitSpy = spyOn(component.hideDialogAndChanged, 'emit').and.callFake(() => callOrder.push('close'))
    msgServiceSpy.success.and.callFake(() => callOrder.push('success'))

    component.onAccept()

    expect(apiServiceSpy.acceptTask).toHaveBeenCalledWith({
      id: 'id',
      acceptTaskRequest: {
        modificationCount: 3,
        input: { decision: 'approved' }
      }
    })
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.ACCEPT.MESSAGE.OK' })
    expect(emitSpy).toHaveBeenCalledWith(true)
    expect(callOrder).toEqual(['close', 'success'])
  })

  it('should decline a task and close dialog on success', () => {
    component.taskData = taskItem
    component.customInputEntries = [{ key: 'reason', value: 'missing-documents' }]
    const callOrder: string[] = []
    const emitSpy = spyOn(component.hideDialogAndChanged, 'emit').and.callFake(() => callOrder.push('close'))
    msgServiceSpy.success.and.callFake(() => callOrder.push('success'))

    component.onDecline()

    expect(apiServiceSpy.declineTask).toHaveBeenCalledWith({
      id: 'id',
      declineTaskRequest: {
        modificationCount: 3,
        input: { reason: 'missing-documents' }
      }
    })
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DECLINE.MESSAGE.OK' })
    expect(emitSpy).toHaveBeenCalledWith(true)
    expect(callOrder).toEqual(['close', 'success'])
  })

  it('should close dialog with false changed flag by default', () => {
    component.taskData = taskItem
    component.customInputEntries = [{ key: 'a', value: 'b' }]
    component.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_500.TASK_ITEM'
    const emitSpy = spyOn(component.hideDialogAndChanged, 'emit')

    component.onDialogHide()

    expect(emitSpy).toHaveBeenCalledWith(false)
    expect(component.taskData).toBeUndefined()
    expect(component.customInputEntries).toEqual([])
    expect(component.exceptionKey).toBeUndefined()
  })

  it('should not call accept api when task id is missing', () => {
    component.taskData = { ...taskItem, id: undefined }

    component.onAccept()

    expect(apiServiceSpy.acceptTask).not.toHaveBeenCalled()
  })

  it('should show an error when accept task fails', () => {
    const errorResponse = { status: 500, statusText: 'Server error' }
    apiServiceSpy.acceptTask.and.returnValue(throwError(() => errorResponse))
    component.taskData = taskItem
    spyOn(console, 'error')

    component.onAccept()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.ACCEPT.MESSAGE.NOK' })
    expect(console.error).toHaveBeenCalledWith('acceptTask', errorResponse)
  })

  it('should not call decline api when task id is missing', () => {
    component.taskData = { ...taskItem, id: undefined }

    component.onDecline()

    expect(apiServiceSpy.declineTask).not.toHaveBeenCalled()
  })

  it('should show an error when decline task fails', () => {
    const errorResponse = { status: 500, statusText: 'Server error' }
    apiServiceSpy.declineTask.and.returnValue(throwError(() => errorResponse))
    component.taskData = taskItem
    spyOn(console, 'error')

    component.onDecline()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DECLINE.MESSAGE.NOK' })
    expect(console.error).toHaveBeenCalledWith('declineTask', errorResponse)
  })

  it('should delete a task and close dialog on success', () => {
    component.taskData = taskItem
    const emitSpy = spyOn(component.hideDialogAndChanged, 'emit')

    component.onDelete()

    expect(apiServiceSpy.deleteTaskById).toHaveBeenCalledWith({ id: 'id' })
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
    expect(emitSpy).toHaveBeenCalledWith(true)
  })

  it('should show an error when deleting a task fails', () => {
    const errorResponse = { status: 500, statusText: 'Server error' }
    apiServiceSpy.deleteTaskById.and.returnValue(throwError(() => errorResponse))
    component.taskData = taskItem
    spyOn(console, 'error')

    component.onDelete()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
    expect(console.error).toHaveBeenCalledWith('deleteTaskById', errorResponse)
  })

  it('should not call delete api when task id is missing', () => {
    component.taskData = { ...taskItem, id: undefined }

    component.onDelete()

    expect(apiServiceSpy.deleteTaskById).not.toHaveBeenCalled()
  })

  it('should execute accept action when requested action is accept', () => {
    component.requestedAction = 'accept'
    const acceptSpy = spyOn(component, 'onAccept')

    component.onRequestedAction()

    expect(acceptSpy).toHaveBeenCalled()
  })

  it('should execute decline action when requested action is decline', () => {
    component.requestedAction = 'decline'
    const declineSpy = spyOn(component, 'onDecline')

    component.onRequestedAction()

    expect(declineSpy).toHaveBeenCalled()
  })

  it('should execute delete action when requested action is delete', () => {
    component.requestedAction = 'delete'
    const deleteSpy = spyOn(component, 'onDelete')

    component.onRequestedAction()

    expect(deleteSpy).toHaveBeenCalled()
  })

  it('should close dialog when requested action is view', () => {
    component.requestedAction = 'view'
    const closeSpy = spyOn(component, 'onDialogHide')

    component.onRequestedAction()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('should execute accept action when requested action is unknown', () => {
    component.requestedAction = 'accept'
    const acceptSpy = spyOn(component, 'onAccept')

    component.onRequestedAction()

    expect(acceptSpy).toHaveBeenCalled()
  })

  it('should return decline header key when requested action is decline', () => {
    component.requestedAction = 'decline'

    expect(component.getRequestedActionHeaderKey()).toBe('ACTIONS.DECLINE.HEADER')
  })

  it('should return requested action icon for accept and decline', () => {
    component.requestedAction = 'accept'
    expect(component.getRequestedActionButtonIcon()).toBe('pi pi-check text-green-600')

    component.requestedAction = 'decline'
    expect(component.getRequestedActionButtonIcon()).toBe('pi pi-times text-red-600')
  })

  it('should return requested action icon for delete', () => {
    component.requestedAction = 'delete'

    expect(component.getRequestedActionButtonIcon()).toBe('pi pi-trash')
  })

  it('should return requested action header key per action', () => {
    component.requestedAction = 'accept'
    expect(component.getRequestedActionHeaderKey()).toBe('ACTIONS.ACCEPT.HEADER')

    component.requestedAction = 'decline'
    expect(component.getRequestedActionHeaderKey()).toBe('ACTIONS.DECLINE.HEADER')

    component.requestedAction = 'delete'
    expect(component.getRequestedActionHeaderKey()).toBe('ACTIONS.DELETE.HEADER')

    component.requestedAction = 'view'
    expect(component.getRequestedActionHeaderKey()).toBe('ACTIONS.VIEW.HEADER')
  })

  it('should return requested action button label key per action', () => {
    component.requestedAction = 'accept'
    expect(component.getRequestedActionButtonLabelKey()).toBe('ACTIONS.ACCEPT.LABEL')

    component.requestedAction = 'decline'
    expect(component.getRequestedActionButtonLabelKey()).toBe('ACTIONS.DECLINE.LABEL')

    component.requestedAction = 'delete'
    expect(component.getRequestedActionButtonLabelKey()).toBe('ACTIONS.DELETE.LABEL')
  })

  it('should return requested action button severity for delete', () => {
    component.requestedAction = 'delete'

    expect(component.getRequestedActionButtonSeverity()).toBe('danger')
  })

  it('should identify input actions correctly', () => {
    component.requestedAction = 'accept'
    expect(component.isInputAction()).toBeTrue()

    component.requestedAction = 'decline'
    expect(component.isInputAction()).toBeTrue()

    component.requestedAction = 'delete'
    expect(component.isInputAction()).toBeFalse()
  })

  it('should identify view action correctly', () => {
    component.requestedAction = 'view'

    expect(component.isViewAction()).toBeTrue()
  })

  it('should add and remove custom input entries', () => {
    component.customInputEntries = []

    component.addCustomInputEntry()
    component.addCustomInputEntry()
    component.updateCustomInputKey(0, 'k1')
    component.updateCustomInputValue(0, 'v1')
    component.removeCustomInputEntry(1)

    expect(component.customInputEntries).toEqual([{ key: 'k1', value: 'v1' }])
  })

  it('should not append blank custom input entry for delete action', () => {
    component.displayDialog = true
    component.requestedAction = 'delete'
    component.taskItem = taskItem

    component.ngOnChanges()

    expect(component.customInputEntries).toEqual([])
  })

  it('should load task data when opening delete action', () => {
    component.displayDialog = true
    component.requestedAction = 'delete'
    component.taskItem = taskItem

    component.ngOnChanges()

    expect(component.taskData?.title).toBe('Task title')
  })

  it('should omit custom input when accepting with no entries', () => {
    component.taskData = taskItem
    component.customInputEntries = []

    component.onAccept()

    expect(apiServiceSpy.acceptTask).toHaveBeenCalledWith({
      id: 'id',
      acceptTaskRequest: {
        modificationCount: 3,
        input: undefined
      }
    })
  })

  it('should trim keys and values and drop empty keys in accept payload', () => {
    component.taskData = taskItem
    component.customInputEntries = [
      { key: '  decision  ', value: '  approved  ' },
      { key: '   ', value: 'ignored' }
    ]

    component.onAccept()

    expect(apiServiceSpy.acceptTask).toHaveBeenCalledWith({
      id: 'id',
      acceptTaskRequest: {
        modificationCount: 3,
        input: { decision: 'approved' }
      }
    })
  })

  it('should use default modification count when accepting a task without modification count', () => {
    component.taskData = { ...taskItem, modificationCount: undefined }

    component.onAccept()

    expect(apiServiceSpy.acceptTask).toHaveBeenCalledWith({
      id: 'id',
      acceptTaskRequest: {
        modificationCount: 0,
        input: undefined
      }
    })
  })

  it('should send undefined input payload for decline when no valid custom input key exists', () => {
    component.taskData = taskItem
    component.customInputEntries = [{ key: '   ', value: 'value' }]

    component.onDecline()

    expect(apiServiceSpy.declineTask).toHaveBeenCalledWith({
      id: 'id',
      declineTaskRequest: {
        modificationCount: 3,
        input: undefined
      }
    })
  })

  it('should use default modification count when declining a task without modification count', () => {
    component.taskData = { ...taskItem, modificationCount: undefined }

    component.onDecline()

    expect(apiServiceSpy.declineTask).toHaveBeenCalledWith({
      id: 'id',
      declineTaskRequest: {
        modificationCount: 0,
        input: undefined
      }
    })
  })

  it('should use primary severity when requested action is accept', () => {
    component.requestedAction = 'accept'

    expect(component.getRequestedActionButtonSeverity()).toBe('primary')
  })

  it('should use the default severity when requested action is decline', () => {
    component.requestedAction = 'decline'

    expect(component.getRequestedActionButtonSeverity()).toBe('primary')
  })

  it('should update custom input entry key and value', () => {
    component.customInputEntries = [{ key: '', value: '' }]

    component.updateCustomInputKey(0, 'approval')
    component.updateCustomInputValue(0, 'yes')

    expect(component.customInputEntries).toEqual([{ key: 'approval', value: 'yes' }])
  })
})
