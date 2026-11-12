import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import {
  AnalyticsService,
  BreakdownItem,
  BreakdownKey,
  GeneralFilterField,
  GeneralPeriod,
  GeneralStats,
  LinkStatusFilter,
} from '../../services/analytics.service';

type QuickRange = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom';

/**
 * Módulo de ESTADÍSTICAS GENERALES.
 *
 * A diferencia del modal "Ver información de clics" del Dashboard (que muestra
 * el detalle de UN enlace vía /api/stats/:alias/clicks), esta pantalla agrega
 * los clics de TODOS los enlaces del usuario vía /api/analytics/general.
 */
@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-200 flex">
      <app-sidebar />

      <main class="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
        <!-- Encabezado -->
        <header class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-white">Estadísticas generales</h2>
            <p class="text-sm text-slate-400 mt-1">
              Interacciones de todos tus enlaces · Zona horaria {{ timeZone }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              (click)="load(page())"
              [disabled]="loading()"
              class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium disabled:opacity-50"
            >
              {{ loading() ? 'Actualizando…' : 'Actualizar' }}
            </button>
            <button
              type="button"
              (click)="exportCsv()"
              [disabled]="!stats()?.clicks?.length"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>
        </header>

        <!-- KPIs globales (sin filtros) -->
        <section class="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8" aria-label="Resumen global">
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Enlaces</p>
            <h3 class="text-3xl font-bold text-white">{{ stats()?.overview?.totalLinks ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">{{ stats()?.overview?.activeLinks ?? 0 }} activos</p>
          </div>
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Clics totales</p>
            <h3 class="text-3xl font-bold text-indigo-400">{{ stats()?.overview?.totalClicks ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">Histórico de todos los enlaces</p>
          </div>
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Visitantes únicos</p>
            <h3 class="text-3xl font-bold text-emerald-400">{{ stats()?.overview?.uniqueVisitors ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">Por token de dispositivo</p>
          </div>
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Hoy</p>
            <h3 class="text-3xl font-bold text-white">{{ stats()?.overview?.clicksToday ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">Clics del día</p>
          </div>
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Últimos 7 días</p>
            <h3 class="text-3xl font-bold text-white">{{ stats()?.overview?.clicksLast7Days ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">Incluye hoy</p>
          </div>
          <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p class="text-slate-400 text-sm mb-1">Últimos 30 días</p>
            <h3 class="text-3xl font-bold text-white">{{ stats()?.overview?.clicksLast30Days ?? 0 }}</h3>
            <p class="text-xs text-slate-500 mt-1">
              Último clic: {{ stats()?.overview?.lastClick ? (stats()!.overview.lastClick | date: 'short') : '—' }}
            </p>
          </div>
        </section>

        <!-- Filtros -->
        <section class="bg-slate-900 p-5 rounded-2xl border border-slate-800 mb-8" aria-label="Filtros">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 class="text-lg font-semibold text-white">Filtros</h3>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Rangos rápidos">
              @for (range of quickRanges; track range.value) {
                <button
                  type="button"
                  (click)="setQuickRange(range.value)"
                  [class]="quickRange === range.value
                    ? 'px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-600 border-indigo-500 text-white'
                    : 'px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'"
                >{{ range.label }}</button>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <label class="text-xs text-slate-400">
              Desde
              <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="quickRange = 'custom'"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white" />
            </label>
            <label class="text-xs text-slate-400">
              Hasta
              <input type="date" [(ngModel)]="dateTo" (ngModelChange)="quickRange = 'custom'"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white" />
            </label>
            <label class="text-xs text-slate-400">
              Hora desde
              <select [(ngModel)]="hourFrom"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">Cualquier hora</option>
                @for (hour of hourOptions; track hour.value) {
                  <option [value]="hour.value">{{ hour.label }}</option>
                }
              </select>
            </label>
            <label class="text-xs text-slate-400">
              Hora hasta
              <select [(ngModel)]="hourTo"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">Cualquier hora</option>
                @for (hour of hourOptions; track hour.value) {
                  <option [value]="hour.value">{{ hour.label }}</option>
                }
              </select>
            </label>
            <label class="text-xs text-slate-400">
              Agrupar por
              <select [(ngModel)]="period" (ngModelChange)="apply()"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="hour">Hora</option>
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </label>
            <label class="text-xs text-slate-400 xl:col-span-2">
              Enlace
              <select [(ngModel)]="alias" (ngModelChange)="apply()"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">Todos los enlaces</option>
                @for (link of stats()?.linkOptions ?? []; track link.alias) {
                  <option [value]="link.alias">/{{ link.alias }}{{ link.activo ? '' : ' (inactivo)' }}</option>
                }
              </select>
            </label>
            <label class="text-xs text-slate-400">
              Estado del enlace
              <select [(ngModel)]="status" (ngModelChange)="apply()"
                class="mt-1 block w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Días de la semana">
            <span class="text-xs text-slate-400 mr-1">Días:</span>
            @for (day of weekdayOptions; track day.value) {
              <button
                type="button"
                (click)="toggleWeekday(day.value)"
                [attr.aria-pressed]="weekdays.includes(day.value)"
                [class]="weekdays.includes(day.value)
                  ? 'w-11 py-1.5 rounded-lg text-xs font-medium border bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'w-11 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'"
              >{{ day.short }}</button>
            }
            <span class="text-xs text-slate-500 ml-2">(sin selección = todos)</span>
          </div>

          <form class="mt-4 flex flex-col md:flex-row gap-3" (ngSubmit)="apply()">
            <label class="sr-only" for="general-filter-field">Campo para filtrar</label>
            <select id="general-filter-field" name="field" [(ngModel)]="field" (ngModelChange)="onFieldChange()"
              class="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white">
              @for (option of fieldOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            @if (field === 'all') {
              <label class="sr-only" for="general-filter-value">Texto para filtrar</label>
              <input id="general-filter-value" name="value" [(ngModel)]="value"
                class="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500"
                placeholder="Buscar en todos los campos (alias, país, navegador, IP, referer…)" />
            } @else {
              <label class="sr-only" for="general-filter-option">Valor del filtro</label>
              <select id="general-filter-option" name="value" [(ngModel)]="value" (ngModelChange)="apply()"
                class="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">Todos los valores</option>
                @for (option of stats()?.filterOptions ?? []; track option) {
                  <option [value]="option">{{ formatFilterOption(option) }}</option>
                }
              </select>
            }
            <button type="submit" [disabled]="loading()"
              class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50">
              Aplicar filtros
            </button>
            <button type="button" (click)="clear()" [disabled]="loading()"
              class="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium disabled:opacity-50">
              Limpiar
            </button>
          </form>
          <p class="text-xs text-slate-500 mt-3">
            Si la hora inicial es mayor que la final (por ejemplo 22:00–03:00) se filtra el horario nocturno.
            Al hacer clic en un elemento de los desgloses se aplica como filtro.
          </p>
        </section>

        @if (error()) {
          <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">{{ error() }}</div>
        }

        @if (loading() && !stats()) {
          <div class="py-20 text-center text-slate-400 animate-pulse">Cargando estadísticas…</div>
        }

        @if (stats(); as s) {
          <!-- Resumen del filtro -->
          <section class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-8" aria-label="Resumen del filtro">
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Clics del filtro</p>
              <p class="text-2xl font-bold text-indigo-300 mt-1">{{ s.summary.matchingClicks }}</p>
              @if (s.summary.previousPeriodClicks !== null) {
                <p [class]="trendClass()">{{ trendLabel() }}</p>
              }
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Visitantes únicos</p>
              <p class="text-2xl font-bold text-emerald-300 mt-1">{{ s.summary.uniqueVisitors }}</p>
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Enlaces con clics</p>
              <p class="text-2xl font-bold text-white mt-1">{{ s.summary.linksWithClicks }}</p>
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Días con actividad</p>
              <p class="text-2xl font-bold text-white mt-1">{{ s.summary.activeDays }}</p>
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Promedio por día</p>
              <p class="text-2xl font-bold text-white mt-1">{{ s.summary.avgClicksPerDay | number: '1.0-2' }}</p>
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Hora pico</p>
              <p class="text-2xl font-bold text-white mt-1">{{ s.summary.peakHour ? hourLabel(s.summary.peakHour.hour) : '—' }}</p>
              @if (s.summary.peakHour) {
                <p class="text-xs text-slate-500 mt-1">{{ s.summary.peakHour.clicks }} clics</p>
              }
            </div>
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-400">Día pico</p>
              <p class="text-2xl font-bold text-white mt-1">{{ s.summary.peakWeekday ? weekdayName(s.summary.peakWeekday.weekday) : '—' }}</p>
              @if (s.summary.peakWeekday) {
                <p class="text-xs text-slate-500 mt-1">{{ s.summary.peakWeekday.clicks }} clics</p>
              }
            </div>
          </section>

          <!-- Clics por periodo -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6" aria-label="Clics por periodo">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-white">Clics por {{ periodLabel(period) }}</h4>
              <span class="text-xs text-slate-500">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-indigo-400 mr-1 align-middle"></span>Clics
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 ml-3 mr-1 align-middle"></span>Únicos
              </span>
            </div>
            @if (s.byPeriod.length) {
              <div class="max-h-80 overflow-y-auto space-y-2 pr-1">
                @for (bucket of s.byPeriod; track bucket.bucket) {
                  <div class="grid grid-cols-[minmax(8rem,auto)_1fr_auto] gap-3 items-center text-sm">
                    <span class="text-slate-400 whitespace-nowrap">{{ formatBucket(bucket.bucket) }}</span>
                    <div class="space-y-1">
                      <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div class="h-full rounded-full bg-indigo-400" [style.width.%]="pct(bucket.clicks, maxPeriod())"></div>
                      </div>
                      <div class="h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div class="h-full rounded-full bg-emerald-400" [style.width.%]="pct(bucket.uniqueVisitors, maxPeriod())"></div>
                      </div>
                    </div>
                    <span class="text-slate-300 tabular-nums text-right w-16">{{ bucket.clicks }} · {{ bucket.uniqueVisitors }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-slate-500">Sin clics para el filtro seleccionado.</p>
            }
          </section>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <!-- Actividad por hora -->
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-label="Actividad por hora">
              <h4 class="font-semibold text-white mb-4">Actividad por hora del día</h4>
              <div class="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 items-end">
                @for (hour of hourOptions; track hour.value) {
                  <div class="text-center" [title]="hour.label + ': ' + hourCount(+hour.value) + ' clics'">
                    <div class="h-44 flex items-end justify-center">
                      <div class="w-full rounded-t bg-indigo-400"
                        [style.height.%]="hourCount(+hour.value) ? Math.max(4, pct(hourCount(+hour.value), maxHour())) : 0"></div>
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1">{{ hour.label.slice(0, 2) }}</div>
                    <div class="text-[10px] text-slate-300 tabular-nums">{{ hourCount(+hour.value) }}</div>
                  </div>
                }
              </div>
            </section>

            <!-- Por día de la semana -->
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-label="Clics por día de la semana">
              <h4 class="font-semibold text-white mb-4">Clics por día de la semana</h4>
              <div class="space-y-3">
                @for (day of weekdayOptions; track day.value) {
                  <div class="grid grid-cols-[6rem_1fr_auto] gap-3 items-center text-sm">
                    <span class="text-slate-400">{{ day.label }}</span>
                    <div class="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div class="h-full rounded-full bg-violet-400" [style.width.%]="pct(weekdayCount(day.value), maxWeekday())"></div>
                    </div>
                    <span class="text-slate-300 tabular-nums w-8 text-right">{{ weekdayCount(day.value) }}</span>
                  </div>
                }
              </div>
            </section>
          </div>

          <!-- Mapa de calor día x hora -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6" aria-label="Mapa de calor por día y hora">
            <h4 class="font-semibold text-white mb-1">Mapa de calor · día y hora</h4>
            <p class="text-xs text-slate-500 mb-4">Identifica en qué horas de cada día se concentran las interacciones.</p>
            <div class="overflow-x-auto">
              <table class="text-[10px] border-separate" style="border-spacing: 3px">
                <thead>
                  <tr>
                    <th class="w-10"></th>
                    @for (hour of hourOptions; track hour.value) {
                      <th class="text-slate-500 font-normal w-7">{{ hour.label.slice(0, 2) }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (day of weekdayOptions; track day.value) {
                    <tr>
                      <td class="text-slate-400 pr-2 text-xs">{{ day.short }}</td>
                      @for (hour of hourOptions; track hour.value) {
                        <td class="w-7 h-7 rounded text-center tabular-nums"
                          [style.background-color]="heatColor(heatCount(day.value, +hour.value))"
                          [class.text-white]="heatCount(day.value, +hour.value) > 0"
                          [title]="day.label + ' ' + hour.label + ': ' + heatCount(day.value, +hour.value) + ' clics'">
                          {{ heatCount(day.value, +hour.value) || '' }}
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Ranking por enlace -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6" aria-label="Clics por enlace">
            <h4 class="font-semibold text-white mb-4">Rendimiento por enlace</h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th class="pb-3 px-3 font-medium">Enlace</th>
                    <th class="pb-3 px-3 font-medium">URL original</th>
                    <th class="pb-3 px-3 font-medium text-right">Clics</th>
                    <th class="pb-3 px-3 font-medium text-right">Únicos</th>
                    <th class="pb-3 px-3 font-medium w-48">Participación</th>
                    <th class="pb-3 px-3 font-medium">Último clic</th>
                    <th class="pb-3 px-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  @for (link of s.byLink; track link.alias) {
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-3 font-medium text-indigo-400 whitespace-nowrap">
                        /{{ link.alias }}
                        @if (!link.activo) {
                          <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">inactivo</span>
                        }
                      </td>
                      <td class="py-3 px-3 max-w-xs truncate text-slate-400" [title]="link.url">{{ link.url }}</td>
                      <td class="py-3 px-3 text-right tabular-nums text-white">{{ link.clicks }}</td>
                      <td class="py-3 px-3 text-right tabular-nums text-slate-300">{{ link.uniqueVisitors }}</td>
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-2">
                          <div class="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full bg-indigo-400" [style.width.%]="link.share"></div>
                          </div>
                          <span class="text-xs text-slate-400 tabular-nums w-12 text-right">{{ link.share }}%</span>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-slate-400 whitespace-nowrap">{{ link.lastClick | date: 'short' }}</td>
                      <td class="py-3 px-3 text-right">
                        <button type="button" (click)="filterByLink(link.alias)"
                          class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                          {{ alias === link.alias ? 'Ver todos' : 'Solo este' }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="py-8 text-center text-slate-500">Ningún enlace tiene clics con este filtro.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Desgloses -->
          <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6" aria-label="Desgloses">
            @for (block of breakdownBlocks; track block.key) {
              <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h4 class="font-semibold text-white mb-4">{{ block.title }}</h4>
                @if (s.breakdowns[block.key].length) {
                  <div class="space-y-3">
                    @for (item of s.breakdowns[block.key]; track item.label) {
                      <button type="button" class="block w-full text-left group"
                        (click)="filterByBreakdown(block.key, item)"
                        [title]="'Filtrar por ' + block.title.toLowerCase() + ': ' + item.label">
                        <div class="flex justify-between gap-3 text-sm mb-1">
                          <span class="text-slate-300 truncate group-hover:text-white">{{ item.label }}</span>
                          <span class="text-slate-400 whitespace-nowrap tabular-nums">{{ item.clicks }} · {{ item.uniqueVisitors }} únicos</span>
                        </div>
                        <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div [class]="'h-full rounded-full ' + block.color"
                            [style.width.%]="pct(item.clicks, maxOf(s.breakdowns[block.key]))"></div>
                        </div>
                      </button>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-slate-500">Sin datos.</p>
                }
              </div>
            }
          </section>

          <!-- Detalle de clics -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden" aria-label="Detalle de clics">
            <div class="p-5 flex flex-wrap items-center justify-between gap-3">
              <h4 class="font-semibold text-white">Detalle de clics</h4>
              <label class="text-xs text-slate-400 flex items-center gap-2">
                Filas
                <select [(ngModel)]="pageSize" (ngModelChange)="load(1)"
                  class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white">
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="25">25</option>
                  <option [ngValue]="50">50</option>
                  <option [ngValue]="100">100</option>
                </select>
              </label>
            </div>
            <div class="overflow-auto">
              <table class="min-w-[1300px] w-full text-left text-sm">
                <thead class="bg-slate-800 text-slate-300">
                  <tr>
                    <th class="p-3 font-medium">Fecha</th>
                    <th class="p-3 font-medium">Enlace</th>
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
                  @for (visit of s.clicks; track visit.id) {
                    <tr class="align-top text-slate-300 hover:bg-slate-800/50">
                      <td class="p-3 whitespace-nowrap">{{ visit.created_at | date: 'short' }}</td>
                      <td class="p-3 whitespace-nowrap text-indigo-400">/{{ visit.alias }}</td>
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
                    <tr><td colspan="12" class="p-8 text-center text-slate-500">No hay clics que coincidan con este filtro.</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400 border-t border-slate-800">
              <span>Mostrando {{ s.clicks.length }} de {{ s.summary.matchingClicks }} coincidencias</span>
              <div class="flex items-center gap-3">
                <button (click)="load(s.page - 1)" [disabled]="loading() || s.page <= 1"
                  class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40">Anterior</button>
                <span>Página {{ s.page }} de {{ s.totalPages }}</span>
                <button (click)="load(s.page + 1)" [disabled]="loading() || s.page >= s.totalPages"
                  class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40">Siguiente</button>
              </div>
            </footer>
          </section>
        }
      </main>
    </div>
  `,
})
export class StatisticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  protected readonly Math = Math;

  // ---------- Estado ----------
  readonly stats = signal<GeneralStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);

  // ---------- Filtros (ligados con ngModel) ----------
  field: GeneralFilterField = 'all';
  value = '';
  alias = '';
  status: LinkStatusFilter = 'all';
  dateFrom = '';
  dateTo = '';
  hourFrom = '';
  hourTo = '';
  weekdays: number[] = [];
  period: GeneralPeriod = 'day';
  pageSize = 25;
  quickRange: QuickRange = 'all';
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // ---------- Catálogos ----------
  readonly hourOptions = Array.from({ length: 24 }, (_, value) => ({
    value: String(value),
    label: `${String(value).padStart(2, '0')}:00`,
  }));

  readonly weekdayOptions = [
    { value: 1, short: 'Lun', label: 'Lunes' },
    { value: 2, short: 'Mar', label: 'Martes' },
    { value: 3, short: 'Mié', label: 'Miércoles' },
    { value: 4, short: 'Jue', label: 'Jueves' },
    { value: 5, short: 'Vie', label: 'Viernes' },
    { value: 6, short: 'Sáb', label: 'Sábado' },
    { value: 7, short: 'Dom', label: 'Domingo' },
  ];

  readonly quickRanges: { value: QuickRange; label: string }[] = [
    { value: 'all', label: 'Todo' },
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: 'month', label: 'Este mes' },
    { value: 'lastMonth', label: 'Mes pasado' },
  ];

  readonly fieldOptions: { value: GeneralFilterField; label: string }[] = [
    { value: 'all', label: 'Todos los campos' },
    { value: 'alias', label: 'Alias del enlace' },
    { value: 'created_at', label: 'Fecha' },
    { value: 'pais', label: 'País' },
    { value: 'estado', label: 'Estado' },
    { value: 'region', label: 'Región' },
    { value: 'browser', label: 'Navegador' },
    { value: 'os', label: 'Sistema operativo' },
    { value: 'device', label: 'Dispositivo' },
    { value: 'referrer', label: 'Referer' },
    { value: 'ip', label: 'IP' },
    { value: 'user_agent', label: 'User-agent' },
    { value: 'token', label: 'Token' },
  ];

  readonly breakdownBlocks: { key: BreakdownKey; title: string; color: string }[] = [
    { key: 'browser', title: 'Navegador', color: 'bg-emerald-400' },
    { key: 'os', title: 'Sistema operativo', color: 'bg-sky-400' },
    { key: 'device', title: 'Dispositivo', color: 'bg-amber-400' },
    { key: 'pais', title: 'País', color: 'bg-rose-400' },
    { key: 'estado', title: 'Estado', color: 'bg-fuchsia-400' },
    { key: 'referrer', title: 'Referer (origen)', color: 'bg-indigo-400' },
  ];

  // ---------- Derivados para gráficas ----------
  readonly maxPeriod = computed(() =>
    Math.max(0, ...(this.stats()?.byPeriod ?? []).map((item) => item.clicks)),
  );
  readonly maxHour = computed(() => Math.max(0, ...(this.stats()?.byHour ?? []).map((i) => i.clicks)));
  readonly maxWeekday = computed(() =>
    Math.max(0, ...(this.stats()?.byWeekday ?? []).map((i) => i.clicks)),
  );
  private readonly hourMap = computed(
    () => new Map((this.stats()?.byHour ?? []).map((i) => [i.hour, i.clicks])),
  );
  private readonly weekdayMap = computed(
    () => new Map((this.stats()?.byWeekday ?? []).map((i) => [i.weekday, i.clicks])),
  );
  private readonly heatMap = computed(
    () => new Map((this.stats()?.heatmap ?? []).map((i) => [`${i.weekday}-${i.hour}`, i.clicks])),
  );
  private readonly maxHeat = computed(() =>
    Math.max(0, ...(this.stats()?.heatmap ?? []).map((i) => i.clicks)),
  );

  ngOnInit() {
    this.load(1);
  }

  // ---------- Carga ----------
  load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.analyticsService
      .getGeneralStats(
        Math.max(1, page),
        {
          field: this.field,
          value: this.value,
          alias: this.alias,
          status: this.status,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          hourFrom: this.hourFrom,
          hourTo: this.hourTo,
          weekdays: this.weekdays,
          period: this.period,
          timeZone: this.timeZone,
        },
        this.pageSize,
      )
      .subscribe({
        next: (data) => {
          this.stats.set(data);
          this.page.set(data.page);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudieron cargar las estadísticas generales.');
          this.loading.set(false);
        },
      });
  }

  apply() {
    this.load(1);
  }

  clear() {
    this.field = 'all';
    this.value = '';
    this.alias = '';
    this.status = 'all';
    this.dateFrom = '';
    this.dateTo = '';
    this.hourFrom = '';
    this.hourTo = '';
    this.weekdays = [];
    this.period = 'day';
    this.quickRange = 'all';
    this.load(1);
  }

  onFieldChange() {
    this.value = '';
    this.load(1);
  }

  toggleWeekday(day: number) {
    this.weekdays = this.weekdays.includes(day)
      ? this.weekdays.filter((d) => d !== day)
      : [...this.weekdays, day].sort();
    this.load(1);
  }

  filterByLink(alias: string) {
    this.alias = this.alias === alias ? '' : alias;
    this.load(1);
  }

  filterByBreakdown(key: BreakdownKey, item: BreakdownItem) {
    this.field = key;
    this.value = item.label;
    this.load(1);
  }

  setQuickRange(range: QuickRange) {
    this.quickRange = range;
    const today = new Date();
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    switch (range) {
      case 'today':
        this.dateFrom = this.dateTo = toIso(today);
        this.period = 'hour';
        break;
      case 'yesterday':
        this.dateFrom = this.dateTo = toIso(addDays(today, -1));
        this.period = 'hour';
        break;
      case '7d':
        this.dateFrom = toIso(addDays(today, -6));
        this.dateTo = toIso(today);
        this.period = 'day';
        break;
      case '30d':
        this.dateFrom = toIso(addDays(today, -29));
        this.dateTo = toIso(today);
        this.period = 'day';
        break;
      case 'month':
        this.dateFrom = toIso(new Date(today.getFullYear(), today.getMonth(), 1));
        this.dateTo = toIso(today);
        this.period = 'day';
        break;
      case 'lastMonth':
        this.dateFrom = toIso(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        this.dateTo = toIso(new Date(today.getFullYear(), today.getMonth(), 0));
        this.period = 'day';
        break;
      default:
        this.dateFrom = '';
        this.dateTo = '';
    }
    this.load(1);
  }

  // ---------- Helpers de vista ----------
  pct(value: number, max: number): number {
    return max ? (value / max) * 100 : 0;
  }

  maxOf(items: BreakdownItem[]): number {
    return Math.max(0, ...items.map((i) => i.clicks));
  }

  hourCount(hour: number): number {
    return this.hourMap().get(hour) ?? 0;
  }

  weekdayCount(day: number): number {
    return this.weekdayMap().get(day) ?? 0;
  }

  heatCount(day: number, hour: number): number {
    return this.heatMap().get(`${day}-${hour}`) ?? 0;
  }

  heatColor(count: number): string {
    const max = this.maxHeat();
    if (!count || !max) return 'rgb(30 41 59)'; // slate-800
    const alpha = 0.25 + 0.75 * (count / max);
    return `rgba(129, 140, 248, ${alpha.toFixed(2)})`; // indigo-400
  }

  hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  weekdayName(day: number): string {
    return this.weekdayOptions.find((d) => d.value === day)?.label ?? '—';
  }

  periodLabel(period: GeneralPeriod): string {
    return { hour: 'hora', day: 'día', week: 'semana', month: 'mes' }[period];
  }

  formatBucket(bucket: string): string {
    const date = new Date(bucket); // hora local devuelta por el backend
    if (Number.isNaN(date.getTime())) return bucket;
    switch (this.period) {
      case 'hour':
        return date.toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      case 'week':
        return `Sem. ${date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
      default:
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  formatFilterOption(value: string): string {
    if (this.field === 'created_at') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString('es-MX');
    }
    return value.length > 100 ? `${value.slice(0, 100)}…` : value;
  }

  trendLabel(): string {
    const s = this.stats()?.summary;
    if (!s || s.previousPeriodClicks === null) return '';
    const prev = s.previousPeriodClicks;
    if (prev === 0) return s.matchingClicks ? 'Sin clics en el periodo anterior' : 'Igual que el periodo anterior';
    const diff = ((s.matchingClicks - prev) / prev) * 100;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}% vs periodo anterior (${prev})`;
  }

  trendClass(): string {
    const s = this.stats()?.summary;
    if (!s || s.previousPeriodClicks === null || s.previousPeriodClicks === 0) return 'text-xs mt-1 text-slate-500';
    return s.matchingClicks >= s.previousPeriodClicks
      ? 'text-xs mt-1 text-emerald-400'
      : 'text-xs mt-1 text-red-400';
  }

  /** Exporta a CSV la página actual del detalle de clics. */
  exportCsv() {
    const rows = this.stats()?.clicks ?? [];
    if (!rows.length) return;
    const headers = ['fecha', 'alias', 'pais', 'estado', 'region', 'navegador', 'sistema', 'dispositivo', 'ip', 'referer', 'user_agent', 'token'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [r.created_at, r.alias, r.pais, r.estado, r.region, r.browser, r.os, r.device, r.ip, r.referrer, r.user_agent, r.token]
        .map(escape)
        .join(','),
    );
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-generales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
