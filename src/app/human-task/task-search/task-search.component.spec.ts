import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { ActivatedRoute } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, take, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { DataSortDirection, RowListGridData } from '@onecx/angular-accelerator'
import { providePermissionService } from '@onecx/angular-utils'

import { Task, TasksInternalAPIService } from 'src/app/shared/generated'
import { TaskSearchComponent } from './task-search.component'

const taskItem1: Task = {
  id: 'id1',
  title: 'Task one',
  providerTaskId: 'provider-1',
  status: 'CREATED' as any,
  providerType: 'CAMUNDA' as any,
  modificationCount: 1
}
const taskItem2: Task = {
  id: 'id2',
  title: 'Task two',
  providerTaskId: 'provider-2',
  description: 'approval from operations',
  status: 'ACCEPTED' as any,
  providerType: 'N8N' as any,
  modificationCount: 2
}

const rowItem1: RowListGridData = { ...taskItem1 } as unknown as RowListGridData
const rowItem2: RowListGridData = { ...taskItem2 } as unknown as RowListGridData
const rowItems: RowListGridData[] = [rowItem1, rowItem2]

describe('TaskSearchComponent', () => {
  let component: TaskSearchComponent
  let fixture: ComponentFixture<TaskSearchComponent>

  const langSubject = new BehaviorSubject<string>('en')
  const userServiceSpy = {
    lang$: langSubject.asObservable(),
    hasPermission: jasmine.createSpy('hasPermission').and.returnValue(Promise.resolve(true))
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error', 'info'])
  const apiServiceSpy = {
    searchTasksByCriteria: jasmine.createSpy('searchTasksByCriteria').and.returnValue(of({ stream: [] }))
  }

  async function initTestComponent() {
    fixture = TestBed.createComponent(TaskSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TaskSearchComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        providePermissionService(),
        { provide: ActivatedRoute, useValue: {} }
      ]
    })
      .overrideComponent(TaskSearchComponent, {
        add: {
          providers: [
            { provide: UserService, useValue: userServiceSpy },
            { provide: TasksInternalAPIService, useValue: apiServiceSpy },
            { provide: PortalMessageService, useValue: msgServiceSpy }
          ]
        }
      })
      .compileComponents()
  }))

  beforeEach(async () => {
    await initTestComponent()
  })

  afterEach(() => {
    userServiceSpy.hasPermission.calls.reset()
    apiServiceSpy.searchTasksByCriteria.calls.reset()
    apiServiceSpy.searchTasksByCriteria.and.returnValue(of({ stream: [] }))
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should search tasks and update data stream', (done) => {
    apiServiceSpy.searchTasksByCriteria.and.returnValue(of({ stream: [taskItem1, taskItem2] }))

    component.onSearch({ title: 'Task' })

    component.data$.pipe(take(1)).subscribe((data) => {
      expect(data).toEqual(rowItems)
      done()
    })
  })

  it('should show info message when search returns no results', () => {
    apiServiceSpy.searchTasksByCriteria.and.returnValue(of({ stream: [] }))

    component.onSearch({ title: 'not-found' })

    expect(msgServiceSpy.info).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NO_RESULTS' })
  })

  it('should fallback to empty list when search response has no stream', (done) => {
    apiServiceSpy.searchTasksByCriteria.and.returnValue(of({}))

    component.onSearch({ title: 'Task' })

    component.data$.pipe(take(1)).subscribe((data) => {
      expect(data).toEqual([])
      expect(msgServiceSpy.info).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NO_RESULTS' })
      done()
    })
  })

  it('should set error state when searching tasks fails', (done) => {
    const errorResponse = { status: '403', statusText: 'Forbidden' }
    apiServiceSpy.searchTasksByCriteria.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.onSearch({})

    component.data$.pipe(take(1)).subscribe((data) => {
      expect(data).toEqual([])
      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_403.TASK_ITEM')
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('searchTasksByCriteria', errorResponse)
      done()
    })
  })

  it('should update sort field and direction', () => {
    component.onSortChange({ sortColumn: 'title', sortDirection: DataSortDirection.ASCENDING })

    expect(component.sortField).toBe('title')
    expect(component.sortDirection).toBe(DataSortDirection.ASCENDING)
  })

  it('should reset criteria and clear local data/filter state', (done) => {
    component.onGlobalFilter('provider-1', rowItems)
    component.onSearch({ title: 'Task' })

    component.onCriteriaReset()

    expect(component.criteria).toEqual({})
    expect(component.filteredData).toBeUndefined()
    expect(component.globalFilterValue).toBe('')

    component.data$.pipe(take(1)).subscribe((data) => {
      expect(data).toEqual([])
      done()
    })
  })

  it('should keep displayed columns unchanged when new keys are the same', () => {
    const initial = [...component.displayedColumnKeys]

    component.onColumnsChange([...initial])

    expect(component.displayedColumnKeys).toEqual(initial)
  })

  it('should update displayed columns when new keys differ', () => {
    const newColumns = ['title', 'status']

    component.onColumnsChange(newColumns)

    expect(component.displayedColumnKeys).toEqual(newColumns)
  })

  it('should open detail dialog when user has view permission', async () => {
    userServiceSpy.hasPermission.and.returnValue(Promise.resolve(true))

    component.onAcceptFromInteractive(rowItem1)
    await fixture.whenStable()

    expect(component.displayDetailDialog).toBeTrue()
    expect(component.item4Detail?.id).toBe('id1')
    expect(component.requestedAction4Detail).toBe('accept')
  })

  it('should open detail dialog for decline when user has view permission', async () => {
    userServiceSpy.hasPermission.and.returnValue(Promise.resolve(true))

    component.onDeclineFromInteractive(rowItem2)
    await fixture.whenStable()

    expect(component.displayDetailDialog).toBeTrue()
    expect(component.item4Detail?.id).toBe('id2')
    expect(component.requestedAction4Detail).toBe('decline')
  })

  it('should open delete dialog when user has delete permission', async () => {
    userServiceSpy.hasPermission.and.returnValue(Promise.resolve(true))

    component.onDeleteFromInteractive(rowItem2)
    await fixture.whenStable()

    expect(component.displayDetailDialog).toBeTrue()
    expect(component.item4Detail?.id).toBe('id2')
    expect(component.requestedAction4Detail).toBe('delete')
  })

  it('should not open detail dialog when permission is denied', async () => {
    userServiceSpy.hasPermission.and.returnValue(Promise.resolve(false))

    component.onAcceptFromInteractive(rowItem1)
    await fixture.whenStable()

    expect(component.displayDetailDialog).toBeFalse()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.TASK_ITEM' })
  })

  it('should show error when permission check fails', async () => {
    const permissionError = new Error('permission check failed')
    userServiceSpy.hasPermission.and.returnValue(Promise.reject(permissionError))
    spyOn(console, 'error')

    component.onDeleteFromInteractive(rowItem2)
    await fixture.whenStable()

    expect(component.displayDetailDialog).toBeFalse()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.TASK_ITEM' })
    expect(console.error).toHaveBeenCalledWith('hasPermission', permissionError)
  })

  it('should filter rows by global filter value', () => {
    component.onGlobalFilter('provider-2', rowItems)

    expect(component.filteredData?.length).toBe(1)
    expect((component.filteredData?.[0] as any).providerTaskId).toBe('provider-2')
  })

  it('should not filter when data is undefined', () => {
    component.filteredData = rowItems

    component.onGlobalFilter('provider', undefined)

    expect(component.filteredData).toEqual(rowItems)
  })

  it('should clear filtered data when filter value is empty', () => {
    component.filteredData = rowItems

    component.onGlobalFilter('', rowItems)

    expect(component.filteredData).toBeUndefined()
    expect(component.globalFilterValue).toBe('')
  })

  it('should clear filtered data when filter value is undefined', () => {
    component.filteredData = rowItems

    component.onGlobalFilter(undefined, rowItems)

    expect(component.filteredData).toBeUndefined()
    expect(component.globalFilterValue).toBe('')
  })

  it('should filter rows by description value', () => {
    component.onGlobalFilter('approval from operations', rowItems)

    expect(component.filteredData?.length).toBe(1)
    expect((component.filteredData?.[0] as any).id).toBe('id2')
  })

  it('should filter rows by status value', () => {
    component.onGlobalFilter('accepted', rowItems)

    expect(component.filteredData?.length).toBe(1)
    expect((component.filteredData?.[0] as any).status).toBe('ACCEPTED')
  })

  it('should filter rows by provider type value', () => {
    component.onGlobalFilter('camunda', rowItems)

    expect(component.filteredData?.length).toBe(1)
    expect((component.filteredData?.[0] as any).providerType).toBe('CAMUNDA')
  })

  it('should clear global filter and input element value', () => {
    const input = document.createElement('input')
    input.value = 'some value'
    component.globalFilterValue = 'some value'
    component.filteredData = rowItems

    component.onClearGlobalFilter(input)

    expect(component.globalFilterValue).toBe('')
    expect(component.filteredData).toBeUndefined()
    expect(input.value).toBe('')
  })

  it('should close detail dialog and reset action without refresh', () => {
    component.displayDetailDialog = true
    component.item4Detail = taskItem1
    component.requestedAction4Detail = 'decline'
    const searchSpy = spyOn(component, 'onSearch')

    component.onCloseDetail(false)

    expect(component.displayDetailDialog).toBeFalse()
    expect(component.item4Detail).toBeUndefined()
    expect(component.requestedAction4Detail).toBe('accept')
    expect(searchSpy).not.toHaveBeenCalled()
  })

  it('should close detail dialog and refresh with existing criteria when requested', () => {
    component.criteria = { title: 'reused-title' }
    const searchSpy = spyOn(component, 'onSearch')

    component.onCloseDetail(true)

    expect(searchSpy).toHaveBeenCalledWith({ title: 'reused-title' }, true)
  })

  it('should keep existing criteria when reusing criteria in search', () => {
    component.criteria = { title: 'existing' }

    component.onSearch({ title: 'new' }, true)

    expect(component.criteria).toEqual({ title: 'existing' })
  })
})
