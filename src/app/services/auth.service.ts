import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(matricule: string, password: string): Observable<boolean> {
    // Mock authentication - accepts any credentials
    const user: User = {
      matricule: matricule,
      name: `User ${matricule}`,
      role: 'Operator',
      avatar: undefined
    };

    // Simulate API call delay
    return of(true).pipe(
      delay(500),
      // Store user in localStorage and update subject
      // Using tap would be cleaner but keeping it simple
    );
  }

  completeLogin(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUserValue;
  }
}
