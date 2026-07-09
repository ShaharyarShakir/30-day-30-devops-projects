import { RouterProvider } from "@tanstack/react-router";

type AppProps = {
  router: any;
};

export default function App({ router }: AppProps) {
  return <RouterProvider router={router} />;
}
