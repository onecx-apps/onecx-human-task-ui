import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { TaskCriteriaComponent } from './task-criteria.component'

describe('TaskCriteriaComponent', () => {
  let component: TaskCriteriaComponent
  let fixture: ComponentFixture<TaskCriteriaComponent>

  function initTestComponent() {
    fixture = TestBed.createComponent(TaskCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TaskCriteriaComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ActivatedRoute, useValue: {} }]
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  describe('construction', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('page actions', () => {
    it('should submit criteria with title and provider task id', () => {
      const emitSpy = spyOn(component.searchEmitter, 'emit')
      component.criteriaForm.controls.title.setValue('my-title')
      component.criteriaForm.controls.providerTaskId.setValue('provider-123')

      component.onSearch()

      expect(emitSpy).toHaveBeenCalledWith({ title: 'my-title', providerTaskId: 'provider-123' })
    })

    it('should submit criteria with undefined values when controls are empty', () => {
      const emitSpy = spyOn(component.searchEmitter, 'emit')

      component.onSearch()

      expect(emitSpy).toHaveBeenCalledWith({ title: undefined, providerTaskId: undefined })
    })

    it('should reset criteria', () => {
      const resetSpy = spyOn(component.criteriaForm, 'reset').and.callThrough()
      const resetEmitterSpy = spyOn(component.resetSearchEmitter, 'emit')

      component.onResetCriteria()

      expect(resetSpy).toHaveBeenCalled()
      expect(resetEmitterSpy).toHaveBeenCalledWith(true)
    })
  })
})
