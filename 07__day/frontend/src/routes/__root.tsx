import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { UserProfile } from '../lib/api';

interface MyRouterContext {
  auth: {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});
