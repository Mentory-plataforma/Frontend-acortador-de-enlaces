import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 p-4">
      <div class="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
          <p class="text-slate-400">Regístrate para empezar a acortar</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input type="email" formControlName="email" 
              class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="tu@email.com">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Contraseña</label>
            <input type="password" formControlName="password" 
              class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2 text-indigo-400">Contraseña Maestra (Secret Code)</label>
            <input type="password" formControlName="secretCode" 
              class="w-full px-4 py-3 rounded-lg bg-slate-800 border border-indigo-900/50 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Código de acceso">
          </div>

          @if (errorMessage) {
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
              {{ errorMessage }}
            </div>
          }

          <button type="submit" [disabled]="loading"
            class="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
            @if (loading) {
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            }
            Registrarse
          </button>
        </form>

        <div class="mt-6 text-center text-sm">
          <span class="text-slate-400">¿Ya tienes cuenta?</span>
          <a routerLink="/login" class="ml-1 text-indigo-400 hover:text-indigo-300 font-medium">Inicia sesión aquí</a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';

  registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    secretCode: ['', [Validators.required]]
  });

  onSubmit() {
    if (this.registerForm.invalid) return;
    
    this.loading = true;
    this.errorMessage = '';

    const { email, password, secretCode } = this.registerForm.value;
    this.authService.register(email!, password!, secretCode!).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.errorMessage = 'Código maestro inválido o error de registro';
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
