import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LinksService, Link } from '../../services/links.service';
import { AnalyticsService, Analytics } from '../../services/analytics.service';
import Pusher from 'pusher-js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-200 flex relative">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div class="p-6 flex items-center gap-3">
          <div
            class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold"
          >
            M
          </div>
          <span class="text-xl font-bold text-white tracking-tight">Mentory Links</span>
        </div>

        <nav class="flex-1 px-4 space-y-2 mt-4">
          <a
            href="#"
            class="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-600/10 text-indigo-400 font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 0m-2-0v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              ></path>
            </svg>
            Dashboard
          </a>
        </nav>

        <div class="p-4 border-t border-slate-800">
          <button
            (click)="onLogout()"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

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
            <h3 class="text-xl font-bold text-white mb-2">Editar Alias</h3>
            <p class="text-sm text-slate-400 mb-5">
              Ingresa el nuevo alias para tu enlace. Debe ser único.
            </p>
            <input
              type="text"
              [(ngModel)]="editAliasValue"
              class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
              placeholder="Ej. mi-nuevo-alias"
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
  editAliasValue = '';

  showToast = false;
  toastMessage = '';
  private toastTimeout: any;

  private pusherInstance: Pusher | null = null;

  private zone = inject(NgZone);

  linkForm: FormGroup = this.fb.group({
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
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

    this.analyticsService.getStats().subscribe({
      next: (respuesta: any) => {
        this.stats = respuesta.data ? respuesta.data : respuesta;
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
    const fullUrl = `https://${this.dominioBase}/${alias}`;
    navigator.clipboard.writeText(fullUrl);

    this.showNotification('¡Enlace copiado al portapapeles!');
  }

  openEditModal(link: Link) {
    this.selectedLink = link;
    this.editAliasValue = link.alias;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedLink = null;
    this.editAliasValue = '';
  }

  confirmEdit() {
    if (
      this.selectedLink &&
      this.editAliasValue &&
      this.editAliasValue !== this.selectedLink.alias
    ) {
      this.linksService
        .update(this.selectedLink.alias, { alias: this.editAliasValue })
        .subscribe(() => {
          this.loadData();
          this.closeEditModal();
          this.showNotification('¡Alias actualizado correctamente!');
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
      this.linksService.delete(this.selectedLink.alias).subscribe(() => {
        this.loadData();
        this.closeDeleteModal();
        this.showNotification('Enlace eliminado del sistema');
      });
    }
  }

  onLogout() {
    this.authService.logout();
  }
}
