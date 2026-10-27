export interface User {
  id: number;
  company_id: number;
  email: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  company_id: number;
  role?: 'superadmin' | 'admin' | 'user';
}

export interface UserUpdate {
  full_name?: string;
  role?: 'superadmin' | 'admin' | 'user';
  is_active?: boolean;
}

/** Edición del propio perfil (`PUT /v1/auth/me`) — a diferencia de
 * `UserUpdate` (que usa un admin para editar a otro usuario), aquí no cabe
 * `role` ni `is_active`: nadie se asciende ni se reactiva a sí mismo. */
export interface ProfileUpdate {
  full_name: string;
}

/** Cambio de la propia contraseña (`PUT /v1/auth/change-password`). Exige la
 * contraseña actual — a diferencia del restablecimiento que hace un admin
 * sobre otro usuario, que no la pide, porque ya demostró su autoridad al
 * iniciar sesión él mismo. */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
