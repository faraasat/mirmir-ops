// Admin Authentication Configuration
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const authOptions = {
  providers: [
    Credentials({
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Authenticate with backend API
          const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          
          if (!response.ok) {
            return null;
          }
          
          const data = await response.json();
          
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          };
        } catch (error) {
          console.error('Admin auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 8 * 60 * 60, // 8 hours
  },
};

const nextAuthResult = NextAuth(authOptions);

// Export handlers separately for API route
export const handlers = nextAuthResult.handlers;

// Export auth with any type to avoid portability issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = nextAuthResult.auth as any;

// Export signIn and signOut
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn = nextAuthResult.signIn as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = nextAuthResult.signOut as any;
