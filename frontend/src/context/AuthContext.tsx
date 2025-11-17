import { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface User {
  userId: string;
  email: string;
  role: string;
  city: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, city: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, firstName: string, lastName: string, phoneNumber: string, role: string, city: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string, city: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      console.log('Logging in:', { email, city });
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    role: string,
    city: string
  ) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      console.log('Registering:', { email, firstName, lastName, role, city });
      setIsLoading(false);
    } catch (error) {
      console.error('Register error:', error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
