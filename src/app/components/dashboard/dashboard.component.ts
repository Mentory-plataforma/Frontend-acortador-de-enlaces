import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LinksService, Link } from '../../services/links.service';
import {
  AnalyticsService,
  Analytics,
  ClickFilterField,
  ClickPeriod,
  LinkClickDetails,
} from '../../services/analytics.service';
import Pusher from 'pusher-js';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-200 flex relative">
      <!-- Sidebar compartido (Dashboard / Estadísticas) -->
      <app-sidebar />

      <!-- Main Content -->
      <main class="flex-1 p-8 overflow-y-auto">
        <header class="mb-8 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-white">Panel de Control</h2>
          <div class="text-sm text-slate-400">Bienvenido de nuevo</div>
        </header>

        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <p class="text-slate-400 text-sm mb-1">Enlaces Totales</p>
            <h3 class="text-4xl font-bold text-white">{{ stats?.totalLinks || 0 }}</h3>
          </div>
          <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <p class="text-slate-400 text-sm mb-1">Clics Globales</p>
            <h3 class="text-4xl font-bold text-indigo-400">{{ stats?.totalClicks || 0 }}</h3>
          </div>
        </div>

        <!-- Formulario -->
        <section class="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-10">
          <h3 class="text-lg font-semibold text-white mb-4">Crear Nuevo Enlace</h3>
          <form
            [formGroup]="linkForm"
            (ngSubmit)="createLink()"
            class="flex flex-col md:flex-row gap-4"
          >
            <div class="flex-1">
              <input
                type="url"
                formControlName="url"
                class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://ejemplo.com/pagina-muy-larga"
              />
            </div>
            <div class="w-full md:w-64">
              <input
                type="text"
                formControlName="alias"
                class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Alias opcional"
              />
            </div>
            <button
              type="submit"
              [disabled]="linkForm.invalid || loading"
              class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              @if (loading) {
                <span class="animate-pulse">Creando...</span>
              } @else {
                Acortar
              }
            </button>
          </form>
        </section>

        <!-- Tabla -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-white">Tus Enlaces</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800"
                >
                  <th class="pb-3 font-medium">URL Original</th>
                  <th class="pb-3 font-medium">Enlace Corto</th>
                  <th class="pb-3 font-medium text-center">Clics</th>
                  <th class="pb-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                @if (cargandoEnlaces) {
                  @for (i of [1, 2, 3]; track i) {
                    <tr class="animate-pulse">
                      <td class="py-4"><div class="h-4 bg-slate-800 rounded w-3/4"></div></td>
                      <td class="py-4"><div class="h-4 bg-slate-800 rounded w-1/2"></div></td>
                      <td class="py-4"><div class="h-4 bg-slate-800 rounded w-8 mx-auto"></div></td>
                      <td class="py-4 text-right">
                        <div class="flex justify-end gap-2">
                          <div class="h-9 w-9 bg-slate-800 rounded-lg"></div>
                          <div class="h-9 w-9 bg-slate-800 rounded-lg"></div>
                          <div class="h-9 w-9 bg-slate-800 rounded-lg"></div>
                        </div>
                      </td>
                    </tr>
                  }
                } @else {
                  @for (link of links; track link.id) {
                    <tr class="group hover:bg-slate-900/50 transition-colors">
                      <td class="py-4 max-w-xs truncate text-slate-300">{{ link.url }}</td>
                      <td class="py-4">
                        <span class="text-indigo-400 font-medium"
                          >{{ dominioBase }}/{{ link.alias }}</span
                        >
                      </td>
                      <td class="py-4 text-center text-slate-400">{{ link.total_clicks }}</td>
                      <td class="py-4 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            (click)="copyLink(link.alias)"
                            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            title="Copiar"
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-6M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              ></path>
                            </svg>
                          </button>
                          <button
                            (click)="openClickDetails(link)"
                            class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                            title="Ver información de clics"
                            [attr.aria-label]="'Ver clics del enlace ' + link.alias"
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 3l13 9-7 1-3 7L5 3zM14 14l5 5"
                              ></path>
                            </svg>
                          </button>
                          <button
                            (click)="openEditModal(link)"
                            class="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
                            title="Editar"
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.586a2 2 0 112.828 2.828L11.828 15H9v-6l2.828-2.828z"
                              ></path>
                            </svg>
                          </button>
                          <button
                            (click)="openDeleteModal(link)"
                            class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="py-10 text-center text-slate-500">
                        No hay enlaces creados todavía.
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <!-- MODAL DE EDICIÓN -->
      @if (showEditModal) {
        <div
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        >
          <div
            class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 class="text-xl font-bold text-white mb-2">Editar Enlace</h3>
            <p class="text-sm text-slate-400 mb-5">
              Ingresa la nueva dirección de destino. Deja el campo vacío para conservar la URL actual.
            </p>
            <input
              type="url"
              [(ngModel)]="editUrlValue"
              [ngModelOptions]="{ standalone: true }"
              class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
              placeholder="https://ejemplo.com/destino"
            />
            <div class="flex justify-end gap-3">
              <button
                (click)="closeEditModal()"
                class="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                (click)="confirmEdit()"
                class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL DE ELIMINACIÓN -->
      @if (showDeleteModal) {
        <div
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        >
          <div
            class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 class="text-xl font-bold text-white mb-2">Eliminar Enlace</h3>
            <p class="text-slate-400 mb-6">
              ¿Estás seguro de que deseas eliminar este enlace? Esta acción desactivará el acceso al
              alias actual.
            </p>
            <div class="flex justify-end gap-3">
              <button
                (click)="closeDeleteModal()"
                class="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                (click)="confirmDelete()"
                class="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL DE INFORMACIÓN DE CLICS -->
      @if (showClickDetailsModal && selectedClicksLink) {
        <div
          class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6"
          (click)="closeClickDetails()"
        >
          <section
            class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl max-h-[92vh] shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="'Información de clics de ' + selectedClicksLink.alias"
            (click)="$event.stopPropagation()"
          >
            <header class="p-5 md:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="text-xl md:text-2xl font-bold text-white">Clics de /{{ selectedClicksLink.alias }}</h3>
                <p class="text-sm text-slate-400 mt-1 truncate">{{ selectedClicksLink.url }}</p>
              </div>
              <button
                (click)="closeClickDetails()"
                class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                aria-label="Cerrar información de clics"
              >
                <span class="text-xl leading-none">×</span>
              </button>
            </header>

            <div class="p-5 md:p-6 overflow-y-auto">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div class="rounded-xl bg-slate-800/80 p-4">
                  <p class="text-xs uppercase tracking-wide text-slate-400">Clics totales</p>
                  <p class="text-2xl font-bold text-indigo-300 mt-1">{{ clickDetails?.totalClicks ?? 0 }}</p>
                </div>
                <div class="rounded-xl bg-slate-800/80 p-4">
                  <p class="text-xs uppercase tracking-wide text-slate-400">Visitantes únicos del filtro</p>
                  <p class="text-2xl font-bold text-emerald-300 mt-1">{{ clickDetails?.uniqueVisitors ?? 0 }}</p>
                </div>
                <div class="rounded-xl bg-slate-800/80 p-4">
                  <p class="text-xs uppercase tracking-wide text-slate-400">Coincidencias del filtro</p>
                  <p class="text-2xl font-bold text-white mt-1">{{ clickDetails?.matchingClicks ?? 0 }}</p>
                </div>
              </div>

              <section class="rounded-xl bg-slate-800/50 border border-slate-800 p-4 mb-4" aria-label="Filtros por fecha y hora">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <label class="text-xs text-slate-400">
                    Desde
                    <input
                      type="date"
                      [(ngModel)]="clickDateFrom"
                      [ngModelOptions]="{ standalone: true }"
                      class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </label>
                  <label class="text-xs text-slate-400">
                    Hasta
                    <input
                      type="date"
                      [(ngModel)]="clickDateTo"
                      [ngModelOptions]="{ standalone: true }"
                      class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </label>
                  <label class="text-xs text-slate-400">
                    Agrupar por
                    <select
                      [(ngModel)]="clickPeriod"
                      [ngModelOptions]="{ standalone: true }"
                      class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="day">Día</option>
                      <option value="week">Semana</option>
                      <option value="month">Mes</option>
                    </select>
                  </label>
                  <label class="text-xs text-slate-400">
                    Hora desde
                    <select
                      [(ngModel)]="clickHourFrom"
                      [ngModelOptions]="{ standalone: true }"
                      class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="">Cualquier hora</option>
                      @for (hour of hourOptions; track hour.value) {
                        <option [value]="hour.value">{{ hour.label }}</option>
                      }
                    </select>
                  </label>
                  <label class="text-xs text-slate-400">
                    Hora hasta
                    <select
                      [(ngModel)]="clickHourTo"
                      [ngModelOptions]="{ standalone: true }"
                      class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="">Cualquier hora</option>
                      @for (hour of hourOptions; track hour.value) {
                        <option [value]="hour.value">{{ hour.label }}</option>
                      }
                    </select>
                  </label>
                  <div class="flex items-end">
                    <button
                      type="button"
                      (click)="applyClickFilter()"
                      class="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                      [disabled]="clickDetailsLoading"
                    >Aplicar fechas</button>
                  </div>
                </div>
                <p class="text-xs text-slate-500 mt-3">Las horas usan {{ clickTimeZone }}. Si la hora inicial supera la final, por ejemplo 22:00–03:00, se filtra el horario nocturno dentro de las fechas elegidas.</p>
              </section>

              <form class="flex flex-col sm:flex-row gap-3 mb-4" (ngSubmit)="applyClickFilter()">
                <label class="sr-only" for="click-filter-field">Campo para filtrar</label>
                <select
                  id="click-filter-field"
                  [(ngModel)]="clickFilterField"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="onClickFilterFieldChange($event)"
                  class="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                >
                  @for (field of clickFilterFields; track field.value) {
                    <option [value]="field.value">{{ field.label }}</option>
                  }
                </select>
                <label class="sr-only" for="click-filter-value">Texto para filtrar</label>
                @if (clickFilterField === 'all') {
                  <input
                    id="click-filter-value"
                    [(ngModel)]="clickFilterValue"
                    [ngModelOptions]="{ standalone: true }"
                    class="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500"
                    placeholder="Buscar en todos los campos"
                  />
                } @else {
                  <label class="sr-only" for="click-filter-option">Valor del filtro</label>
                  <select
                    id="click-filter-option"
                    [(ngModel)]="clickFilterValue"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="applyClickFilter()"
                    class="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Todos los valores</option>
                    @for (option of clickDetails?.filterOptions ?? []; track option) {
                      <option [value]="option">{{ formatClickFilterOption(option) }}</option>
                    }
                  </select>
                }
                <button
                  type="submit"
                  class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                  [disabled]="clickDetailsLoading"
                >
                  Filtrar
                </button>
                <button
                  type="button"
                  (click)="clearClickFilter()"
                  class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium disabled:opacity-50"
                  [disabled]="clickDetailsLoading || (!clickFilterValue && clickFilterField === 'all' && !clickDateFrom && !clickDateTo && !clickHourFrom && !clickHourTo && clickPeriod === 'day')"
                >
                  Limpiar
                </button>
              </form>

              @if (clickDetailsError) {
                <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                  {{ clickDetailsError }}
                </div>
              }

              <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <section class="rounded-xl border border-slate-800 bg-slate-800/30 p-4" aria-label="Clics por navegador">
                  <h4 class="font-semibold text-white mb-3">Clics por navegador</h4>
                  @if (clickDetails?.byBrowser?.length) {
                    <div class="space-y-3">
                      @for (browser of clickDetails?.byBrowser ?? []; track browser.browser) {
                        <div>
                          <div class="flex justify-between gap-3 text-sm mb-1">
                            <span class="text-slate-300">{{ browser.browser }}</span>
                            <span class="text-slate-400">{{ browser.clicks }} clics · {{ browser.uniqueVisitors }} visitantes</span>
                          </div>
                          <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full bg-emerald-400" [style.width.%]="browserBarWidth(browser.clicks)"></div>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-sm text-slate-500">Sin datos para el periodo seleccionado.</p>
                  }
                </section>

                <section class="rounded-xl border border-slate-800 bg-slate-800/30 p-4" aria-label="Horas de mayor actividad">
                  <h4 class="font-semibold text-white mb-3">Actividad por hora</h4>
                  <div class="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end">
                    @for (hour of hourOptions; track hour.value) {
                      <div class="text-center" [title]="hour.label + ': ' + hourClickCount(hour.value) + ' clics'">
                        <div class="h-16 flex items-end justify-center">
                          <div class="w-3/4 min-h-0.5 rounded-t bg-indigo-400" [style.height.%]="hourBarHeight(hour.value)"></div>
                        </div>
                        <div class="text-[10px] text-slate-500 mt-1">{{ hour.label.slice(0, 2) }}</div>
                        <div class="text-[10px] text-slate-300">{{ hourClickCount(hour.value) }}</div>
                      </div>
                    }
                  </div>
                </section>

                <section class="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-800/30 p-4" aria-label="Clics por periodo">
                  <h4 class="font-semibold text-white mb-3">Clics por {{ periodLabel(clickDetails?.period ?? clickPeriod) }}</h4>
                  @if (clickDetails?.byPeriod?.length) {
                    <div class="max-h-52 overflow-y-auto space-y-2">
                      @for (bucket of clickDetails?.byPeriod ?? []; track bucket.bucket) {
                        <div class="grid grid-cols-[minmax(5rem,auto)_1fr_auto] gap-3 items-center text-sm">
                          <span class="text-slate-400">{{ formatPeriodBucket(bucket.bucket) }}</span>
                          <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full bg-indigo-400" [style.width.%]="periodBarWidth(bucket.clicks)"></div>
                          </div>
                          <span class="text-slate-300 tabular-nums">{{ bucket.clicks }}</span>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-sm text-slate-500">Sin clics para agrupar.</p>
                  }
                </section>
              </div>

              @if (clickDetailsLoading && !clickDetails) {
                <div class="py-14 text-center text-slate-400">Cargando clics…</div>
              } @else {
                <div class="overflow-auto rounded-xl border border-slate-800">
                  <table class="min-w-[1200px] w-full text-left text-sm">
                    <thead class="sticky top-0 bg-slate-800 text-slate-300">
                      <tr>
                        <th class="p-3 font-medium">Fecha</th>
                        <th class="p-3 font-medium">País</th>
                        <th class="p-3 font-medium">Estado</th>
                        <th class="p-3 font-medium">Región</th>
                        <th class="p-3 font-medium">Navegador</th>
                        <th class="p-3 font-medium">Sistema</th>
                        <th class="p-3 font-medium">Dispositivo</th>
                        <th class="p-3 font-medium">IP</th>
                        <th class="p-3 font-medium">Referer</th>
                        <th class="p-3 font-medium">User-agent</th>
                        <th class="p-3 font-medium">Token</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      @for (visit of clickDetails?.clicks ?? []; track visit.id) {
                        <tr class="align-top text-slate-300 hover:bg-slate-800/50">
                          <td class="p-3 whitespace-nowrap">{{ visit.created_at | date: 'short' }}</td>
                          <td class="p-3">{{ visit.pais || '—' }}</td>
                          <td class="p-3">{{ visit.estado || '—' }}</td>
                          <td class="p-3">{{ visit.region || '—' }}</td>
                          <td class="p-3">{{ visit.browser || '—' }}</td>
                          <td class="p-3">{{ visit.os || '—' }}</td>
                          <td class="p-3">{{ visit.device || '—' }}</td>
                          <td class="p-3">{{ visit.ip || '—' }}</td>
                          <td class="p-3 max-w-48 truncate" [title]="visit.referrer || ''">{{ visit.referrer || '—' }}</td>
                          <td class="p-3 max-w-64 break-all">{{ visit.user_agent || '—' }}</td>
                          <td class="p-3 max-w-40 break-all">{{ visit.token || '—' }}</td>
                        </tr>
                      } @empty {
                        @if (!clickDetailsLoading) {
                          <tr>
                            <td colspan="11" class="p-8 text-center text-slate-500">No hay clics que coincidan con este filtro.</td>
                          </tr>
                        }
                      }
                    </tbody>
                  </table>
                </div>

                <footer class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-400">
                  <span>Mostrando {{ clickDetails?.clicks?.length ?? 0 }} de {{ clickDetails?.matchingClicks ?? 0 }} coincidencias</span>
                  <div class="flex items-center gap-3">
                    <button
                      (click)="changeClickPage(-1)"
                      class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                      [disabled]="clickDetailsLoading || !clickDetails || clickDetails.page <= 1"
                    >Anterior</button>
                    <span>Página {{ clickDetails?.page ?? 1 }} de {{ clickDetails?.totalPages ?? 0 }}</span>
                    <button
                      (click)="changeClickPage(1)"
                      class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                      [disabled]="clickDetailsLoading || !clickDetails || clickDetails.page >= clickDetails.totalPages"
                    >Siguiente</button>
                  </div>
                </footer>
              }
            </div>
          </section>
        </div>
      }

      <!-- TOAST DE NOTIFICACIÓN ELEGANTE (Aparece y desaparece) -->
      @if (showToast) {
        <div
          class="fixed bottom-6 right-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <span class="font-medium">{{ toastMessage }}</span>
        </div>
      }

      @if (showToastError) {
       <div class="fixed bottom-6 right-6 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>

          <span class="font-medium">{{ toastMessageError }}</span>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private linksService = inject(LinksService);
  private analyticsService = inject(AnalyticsService);
  private cdr = inject(ChangeDetectorRef);

  links: Link[] = [];
  stats: Analytics | null = null;
  loading = false;
  cargandoEnlaces = true;
  dominioBase = environment.apiUrl.replace(/^https?:\/\//, '');

  showEditModal = false;
  showDeleteModal = false;
  selectedLink: Link | null = null;
  editUrlValue = '';

  showClickDetailsModal = false;
  selectedClicksLink: Link | null = null;
  clickDetails: LinkClickDetails | null = null;
  clickDetailsLoading = false;
  clickDetailsError = '';
  clickFilterField: ClickFilterField = 'all';
  clickFilterValue = '';
  clickDateFrom = '';
  clickDateTo = '';
  clickHourFrom = '';
  clickHourTo = '';
  clickPeriod: ClickPeriod = 'day';
  readonly clickTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  readonly hourOptions = Array.from({ length: 24 }, (_, value) => ({
    value: String(value),
    label: `${String(value).padStart(2, '0')}:00`,
  }));
  readonly clickFilterFields: { value: ClickFilterField; label: string }[] = [
    { value: 'all', label: 'Todos los campos' },
    { value: 'created_at', label: 'Fecha' },
    { value: 'token', label: 'Token' },
    { value: 'user_agent', label: 'User-agent' },
    { value: 'ip', label: 'IP' },
    { value: 'pais', label: 'País' },
    { value: 'estado', label: 'Estado' },
    { value: 'region', label: 'Región' },
    { value: 'browser', label: 'Navegador' },
    { value: 'os', label: 'Sistema operativo' },
    { value: 'device', label: 'Dispositivo' },
    { value: 'referrer', label: 'Referer' },
  ];

  showToast = false;
  //Notificación Error
  showToastError = false;

  toastMessage = '';
  toastMessageError = '';

  private toastTimeout: any;

  private pusherInstance: Pusher | null = null;

  private zone = inject(NgZone);

  linkForm: FormGroup = this.fb.group({
    url: ['', [Validators.required, Validators.pattern('https?://.+'), this.urlExist.bind(this)]],
    alias: [''],
  });

  ngOnInit() {
    this.loadData();
    this.iniciarTiempoReal();
  }

  iniciarTiempoReal() {
    this.pusherInstance = new Pusher(environment.pusherKey, {
      cluster: environment.pusherCluster,
    });

    const channel = this.pusherInstance.subscribe('mentory-stats');

    channel.bind('nuevo-clic', (data: { alias: string; total_clicks: number }) => {
      this.zone.run(() => {
        this.links = this.links.map((link) => {
          if (link.alias === data.alias) {
            return { ...link, total_clicks: data.total_clicks };
          }
          return link;
        });

        if (this.stats) {
          this.stats = {
            ...this.stats,
            totalClicks: Number(this.stats.totalClicks) + 1,
          };
        }
        // Mantiene sincronizadas las tarjetas con el backend tras un nuevo clic.
        this.refreshSummary();

        this.cdr.detectChanges();
      });
    });
  }

  loadData() {
    this.cargandoEnlaces = true;
    this.linksService.getAll().subscribe({
      next: (respuesta: any) => {
        const datosCrudos = respuesta.data ? respuesta.data : respuesta;
        this.links = Array.isArray(datosCrudos) ? datosCrudos : [];
        this.cargandoEnlaces = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando enlaces:', err);
        this.cargandoEnlaces = false;
        this.cdr.detectChanges();
      },
    });

    this.refreshSummary();
  }

  /** Tarjetas "Enlaces Totales" y "Clics Globales" desde GET /api/analytics/summary. */
  refreshSummary() {
    this.analyticsService.getStats().subscribe({
      next: (summary) => {
        this.stats = summary;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando analíticas:', err),
    });
  }

  showNotification(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.detectChanges();

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  showNotificationError(message: string) {
    this.toastMessageError = message;
    this.showToastError = true; 
    this.cdr.detectChanges();

     if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.showToastError = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  createLink() {
    if (this.linkForm.invalid) return;
    this.loading = true;
    const { url, alias } = this.linkForm.value;
    this.linksService.create(url!, alias!).subscribe({
      next: () => {
        this.linkForm.reset();
        this.loadData();
        this.showNotification('¡Enlace acortado con éxito!');
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  copyLink(alias: string) {
    const url = `${environment.apiUrl}/${alias}`;
    //const fullUrl = `https://${this.dominioBase}/${alias}`;
    navigator.clipboard.writeText(url);

    this.showNotification('¡Enlace copiado al portapapeles!');
  }

  openClickDetails(link: Link) {
    this.selectedClicksLink = link;
    this.showClickDetailsModal = true;
    this.clickDetails = null;
    this.clickFilterField = 'all';
    this.clickFilterValue = '';
    this.clickDateFrom = '';
    this.clickDateTo = '';
    this.clickHourFrom = '';
    this.clickHourTo = '';
    this.clickPeriod = 'day';
    this.loadClickDetails();
  }

  closeClickDetails() {
    this.showClickDetailsModal = false;
    this.selectedClicksLink = null;
    this.clickDetails = null;
    this.clickDetailsError = '';
  }

  applyClickFilter() {
    this.loadClickDetails(1);
  }

  onClickFilterFieldChange(field: ClickFilterField) {
    this.clickFilterField = field;
    this.clickFilterValue = '';
    this.loadClickDetails(1);
  }

  formatClickFilterOption(value: string): string {
    if (this.clickFilterField === 'created_at') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    return value.length > 100 ? `${value.slice(0, 100)}…` : value;
  }

  clearClickFilter() {
    this.clickFilterField = 'all';
    this.clickFilterValue = '';
    this.clickDateFrom = '';
    this.clickDateTo = '';
    this.clickHourFrom = '';
    this.clickHourTo = '';
    this.clickPeriod = 'day';
    this.loadClickDetails(1);
  }

  changeClickPage(direction: -1 | 1) {
    if (!this.clickDetails) return;
    this.loadClickDetails(this.clickDetails.page + direction);
  }

  private loadClickDetails(page = 1) {
    const link = this.selectedClicksLink;
    if (!link) return;

    this.clickDetailsLoading = true;
    this.clickDetailsError = '';
    this.analyticsService
      .getLinkClicks(link.alias, page, {
        field: this.clickFilterField,
        value: this.clickFilterValue,
        dateFrom: this.clickDateFrom,
        dateTo: this.clickDateTo,
        hourFrom: this.clickHourFrom,
        hourTo: this.clickHourTo,
        period: this.clickPeriod,
        timeZone: this.clickTimeZone,
      })
      .subscribe({
        next: (details) => {
          this.clickDetails = details;
          this.clickDetailsLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.clickDetailsError =
            error?.error?.message || 'No se pudieron cargar los clics de este enlace.';
          this.clickDetailsLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private get maxBrowserClicks(): number {
    return Math.max(0, ...(this.clickDetails?.byBrowser ?? []).map((item) => item.clicks));
  }

  private get maxHourClicks(): number {
    return Math.max(0, ...(this.clickDetails?.byHour ?? []).map((item) => item.clicks));
  }

  private get maxPeriodClicks(): number {
    return Math.max(0, ...(this.clickDetails?.byPeriod ?? []).map((item) => item.clicks));
  }

  browserBarWidth(clicks: number): number {
    return this.maxBrowserClicks ? (clicks / this.maxBrowserClicks) * 100 : 0;
  }

  hourClickCount(hourValue: string): number {
    return this.clickDetails?.byHour.find((item) => item.hour === Number.parseInt(hourValue, 10))?.clicks ?? 0;
  }

  hourBarHeight(hourValue: string): number {
    const count = this.hourClickCount(hourValue);
    return this.maxHourClicks ? Math.max(4, (count / this.maxHourClicks) * 100) : 0;
  }

  periodBarWidth(clicks: number): number {
    return this.maxPeriodClicks ? (clicks / this.maxPeriodClicks) * 100 : 0;
  }

  periodLabel(period: ClickPeriod): string {
    return period === 'month' ? 'mes' : period === 'week' ? 'semana' : 'día';
  }

  formatPeriodBucket(bucket: string): string {
    const date = new Date(bucket);
    return Number.isNaN(date.getTime())
      ? bucket
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  openEditModal(link: Link) {
    this.selectedLink = link;
    this.editUrlValue = '';
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedLink = null;
    this.editUrlValue = '';
  }

  private urlExist(fieldIn: AbstractControl): null | ValidationErrors{
  const url = fieldIn.value;
    if (!fieldIn) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return { InvalidUrl: true };
  }
  }

  private isValidDestinationUrl(value: string): boolean {
    try {
      const parsedUrl = new URL(value);
      return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && !!parsedUrl.hostname;
    } catch {
      return false;
    }
  }

  confirmEdit() {
    if (this.selectedLink) {
      const changes: { url?: string } = {};
      const url = this.editUrlValue.trim();

      if (url && !this.isValidDestinationUrl(url)) {
        this.showNotificationError('La URL no es válida. Ingresa una dirección http o https.');
        return;
      }
      if (url && url !== this.selectedLink.url) changes.url = url;

      if (Object.keys(changes).length === 0) {
        this.closeEditModal();
        return;
      }

      this.linksService.update(this.selectedLink.alias, changes).subscribe({
        next: () => {
          this.loadData();
          this.closeEditModal();
          this.showNotification('¡Enlace actualizado correctamente!');
        },
        error: (err) => {
          console.error('Error actualizando enlace:', err);
          this.showNotificationError('No se pudo actualizar el enlace');
        },
      });
    } else {
      this.closeEditModal();
    }
  }

  openDeleteModal(link: Link) {
    this.selectedLink = link;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedLink = null;
  }

  confirmDelete() {
    if (this.selectedLink) {
      this.linksService.desactivate(this.selectedLink.alias).subscribe({
        next: () => {
          this.loadData();
          this.closeDeleteModal();
          this.showNotification('Enlace desactivado');
        },
        error: (err) => {
          console.error('Error desactivando enlace:', err);
          this.showNotification('No se pudo desactivar el enlace');
        },
      });
    }
  }

  onLogout() {
    this.authService.logout();
  }
}
