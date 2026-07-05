import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '../components/layout/AppShell';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
