import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, catchError, finalize, map, Observable, of, Subscription, tap } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  Action,
  AngularAcceleratorModule,
  ColumnType,
  DataSortDirection,
  DataTableColumn,
  RowListGridData
} from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'

import { Task, TaskPageResult, TasksInternalAPIService, TaskSearchCriteria } from 'src/app/shared/generated'
import { TaskActionType, TaskDetailComponent } from '../task-detail/task-detail.component'
import { TaskCriteriaComponent } from './task-criteria/task-criteria.component'

export type ExtendedColumn = {
  field: string
  labelKey: string
  active?: boolean
  tooltipKey?: string
  sortable?: boolean
  filterable?: boolean
  cssHeader?: string
  cssBody?: string
}

@Component({
  selector: 'app-task-search',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    AsyncPipe,
    NgTemplateOutlet,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    FloatLabelModule,
    MessageModule,
    TooltipModule,
    TranslateModule,
    PortalPageComponent,
    TaskCriteriaComponent,
    TaskDetailComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-search.component.html',
  styleUrl: './task-search.component.scss'
})
export class TaskSearchComponent implements OnInit {
  public searching = false
  public exceptionKey: string | undefined
  public actions$: Observable<Action[]> | undefined
  public criteria: TaskSearchCriteria = {}
  public displayDetailDialog = false
  public requestedAction4Detail: TaskActionType = 'accept'
  public sortField = 'creationDate'
  public sortDirection = DataSortDirection.DESCENDING

  private readonly destroyRef = inject(DestroyRef)
  private readonly user = inject(UserService)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)
  private readonly tasksApi = inject(TasksInternalAPIService)

  private readonly dataSubject$ = new BehaviorSubject<RowListGridData[]>([])
  public readonly data$: Observable<RowListGridData[] | null> = this.dataSubject$.asObservable()
  private searchSubscription?: Subscription

  public filteredData: RowListGridData[] | undefined = undefined
  public globalFilterValue = ''
  public item4Detail: Task | undefined

  public displayedColumnKeys: string[] = [
    'taskActions',
    'title',
    'providerTaskId',
    'description',
    'status',
    'providerType'
  ]
  public readonly dataViewColumns: ExtendedColumn[] = [
    {
      field: 'taskActions',
      active: true,
      labelKey: 'ACTIONS.LABEL',
      tooltipKey: 'ACTIONS.TOOLTIP',
      sortable: false,
      filterable: false,
      cssHeader:
        'flex flex-row flex-nowrap align-items-center justify-content-center text-center column-gap-2 px-2 sm:px-3 white-space-nowrap',
      cssBody: 'py-0 px-2 sm:px-3'
    },
    {
      field: 'title',
      active: true,
      labelKey: 'TASK_ITEM.TITLE',
      tooltipKey: 'TASK_ITEM.TOOLTIPS.TITLE',
      sortable: true,
      filterable: false,
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 px-2 sm:px-3 white-space-nowrap',
      cssBody: 'py-0 px-2 sm:px-3'
    },
    {
      field: 'providerTaskId',
      active: true,
      labelKey: 'TASK_ITEM.PROVIDER_TASK_ID',
      tooltipKey: 'TASK_ITEM.TOOLTIPS.PROVIDER_TASK_ID',
      sortable: true,
      filterable: false,
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 px-2 sm:px-3 white-space-nowrap',
      cssBody: 'py-0 px-2 sm:px-3'
    },
    {
      field: 'description',
      active: true,
      labelKey: 'ACTIONS.DESCRIPTION',
      tooltipKey: 'ACTIONS.DESCRIPTION',
      sortable: true,
      filterable: false,
      cssHeader: 'hidden lg:flex flex-row flex-nowrap align-items-center column-gap-2 px-3 white-space-nowrap',
      cssBody: 'hidden lg:table-cell py-0 px-3'
    },
    {
      field: 'status',
      active: true,
      labelKey: 'TASK_ITEM.STATUS',
      tooltipKey: 'TASK_ITEM.TOOLTIPS.STATUS',
      sortable: true,
      filterable: false,
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 px-2 sm:px-3 white-space-nowrap',
      cssBody: 'py-0 px-2 sm:px-3'
    },
    {
      field: 'providerType',
      active: true,
      labelKey: 'TASK_ITEM.PROVIDER_TYPE',
      tooltipKey: 'TASK_ITEM.TOOLTIPS.PROVIDER_TYPE',
      sortable: true,
      filterable: false,
      cssHeader: 'hidden md:flex flex-row flex-nowrap align-items-center column-gap-2 px-3 white-space-nowrap',
      cssBody: 'hidden md:table-cell py-0 px-3'
    }
  ]
  public readonly interactiveColumns: DataTableColumn[] = this.createInteractiveColumns()

  public ngOnInit(): void {
    this.onSearch({})
  }

  /****************************************************************************
   *  UI Events
   */
  public onCriteriaReset(): void {
    this.criteria = {}
    this.dataSubject$.next([])
    this.filteredData = undefined
    this.globalFilterValue = ''
  }

  public onColumnsChange(activeIds: string[]): void {
    if (
      activeIds.length === this.displayedColumnKeys.length &&
      activeIds.every((value, index) => value === this.displayedColumnKeys[index])
    ) {
      return
    }
    this.displayedColumnKeys = activeIds
  }

  public onGlobalFilter(value?: string, data?: RowListGridData[]): void {
    if (!data) return
    this.globalFilterValue = value ?? ''
    if (this.globalFilterValue === '') {
      this.filteredData = undefined
      return
    }

    const query = this.globalFilterValue.toLowerCase()
    this.filteredData = data.filter(
      (row) =>
        row['title']?.toString().toLowerCase().includes(query) ||
        row['providerTaskId']?.toString().toLowerCase().includes(query) ||
        row['description']?.toString().toLowerCase().includes(query) ||
        row['status']?.toString().toLowerCase().includes(query) ||
        row['providerType']?.toString().toLowerCase().includes(query)
    )
  }

  public onClearGlobalFilter(input?: HTMLInputElement): void {
    this.globalFilterValue = ''
    this.filteredData = undefined
    if (input) input.value = ''
  }

  public onSortChange(event: { sortColumn: string; sortDirection: DataSortDirection }): void {
    this.sortField = event.sortColumn
    this.sortDirection = event.sortDirection
  }

  /****************************************************************************
   *  DETAIL
   */
  public onDetail(item: RowListGridData | undefined, requestedAction: TaskActionType): void {
    this.item4Detail = item as Task | undefined
    this.requestedAction4Detail = requestedAction
    this.displayDetailDialog = true
  }

  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    this.item4Detail = undefined
    this.requestedAction4Detail = 'accept'
    if (refresh) this.onSearch(this.criteria, true)
  }

  public onSearch(criteria: TaskSearchCriteria, reuseCriteria = false): void {
    if (!reuseCriteria) this.criteria = criteria
    this.searching = true
    this.exceptionKey = undefined

    this.searchSubscription?.unsubscribe()
    this.searchSubscription = this.tasksApi
      .searchTasksByCriteria({ taskSearchCriteria: this.criteria })
      .pipe(
        tap((data: TaskPageResult) => {
          if ((data.stream ?? []).length === 0) {
            this.msgService.info({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NO_RESULTS' })
          }
        }),
        map((data: TaskPageResult) => (data.stream as unknown as RowListGridData[]) ?? []),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.TASK_ITEM'
          this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NOK' })
          console.error('searchTasksByCriteria', err)
          return of([])
        }),
        finalize(() => (this.searching = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => this.dataSubject$.next(data))
  }

  private ensureHasPermission(permission: string, onGranted: () => void): void {
    this.user
      .hasPermission(permission)
      .then((granted) => {
        if (!granted) {
          this.msgService.error({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.TASK_ITEM' })
          return
        }
        onGranted()
      })
      .catch((err) => {
        console.error('hasPermission', err)
        this.msgService.error({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.TASK_ITEM' })
      })
  }

  public onAcceptFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('TASK#VIEW', () => this.onDetail(item, 'accept'))
  }

  public onDeclineFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('TASK#VIEW', () => this.onDetail(item, 'decline'))
  }

  public onDeleteFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('TASK#DELETE', () => this.onDetail(item, 'delete'))
  }

  private createInteractiveColumns(): DataTableColumn[] {
    return this.dataViewColumns.map((col) => ({
      id: col.field,
      nameKey: col.labelKey,
      tooltipKey: col.tooltipKey,
      columnType: ColumnType.STRING,
      sortable: col.sortable === true,
      filterable: col.filterable === true,
      cssHeader: col.cssHeader,
      cssBody: col.cssBody
    }))
  }
}
