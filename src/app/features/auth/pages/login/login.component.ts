import { Component, DestroyRef, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { tap, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../companies/services/company.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  loginForm: FormGroup;
  loading = false;
  error: string | null = null;

  private destroyRef = inject(DestroyRef);

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    this.authService
      .login(this.loginForm.value)
      .pipe(
        tap((response) => this.authService.setAccessToken(response.access_token)),
        switchMap(() => this.authService.getCurrentUser()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.authService.setCurrentUser(user);
          // La propia empresa como punto de partida del selector — sin esto,
          // `selectedCompany` queda vacío hasta que un superadmin cambie de
          // contexto, y el header muestra "KnowledgeSpace" en vez del nombre
          // real. Si falla (red, 404), no bloquea el login: el header vuelve
          // a caer en ese mismo texto genérico, que es peor cosmética, no un
          // error funcional.
          this.companyService
            .getMyCompany()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (company) => this.authService.setSelectedCompany(company),
              error: () => {},
            });
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.error = 'Email o contraseña incorrectos';
          this.loading = false;
        },
      });
  }
}
