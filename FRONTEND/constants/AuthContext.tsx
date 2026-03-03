import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthAPI, UserProfile, getToken, saveToken, clearToken } from './api';

// The in-app user shape (camelCase for consistency with existing UI code)
interface AuthContextUser {
  name: string;
  email: string;
  age: string;
  gender: string;
  weightKg: number | null;
  heightCm: number | null;
  healthGoals: string;
  dietaryRestrictions: string[];   // parsed list
  knownAllergens: string[];
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: AuthContextUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: string;
  gender?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  healthGoals: string;
  dietaryRestrictions?: string[];
  knownAllergens?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

function toContextUser(p: UserProfile): AuthContextUser {
  return {
    name: p.name,
    email: p.email,
    age: p.age,
    gender: p.gender,
    weightKg: p.weight_kg,
    heightCm: p.height_cm,
    healthGoals: p.health_goals,
    dietaryRestrictions: p.dietary_restrictions_list ?? [],
    knownAllergens: p.known_allergens ?? [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const { data } = await AuthAPI.getProfile();
          if (data) setUser(toContextUser(data));
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await AuthAPI.login(email, password);
    if (error || !data) return { success: false, error: error || 'Login failed.' };
    await saveToken(data.token);
    setUser(toContextUser(data.user));
    return { success: true };
  };

  const register = async (regData: RegisterData) => {
    const { data, error } = await AuthAPI.register({
      name: regData.name,
      email: regData.email,
      password: regData.password,
      age: regData.age,
      gender: regData.gender || '',
      weight_kg: regData.weightKg ?? null,
      height_cm: regData.heightCm ?? null,
      health_goals: regData.healthGoals,
      // Send dietary_restrictions as comma-string to match backend CharField
      dietary_restrictions: (regData.dietaryRestrictions ?? []).join(','),
      known_allergens: regData.knownAllergens ?? [],
    });
    if (error || !data) return { success: false, error: error || 'Registration failed.' };
    await saveToken(data.token);
    setUser(toContextUser(data.user));
    return { success: true };
  };

  const logout = async () => {
    try { await AuthAPI.logout(); } catch {}
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export type { AuthContextUser as UserProfile };
