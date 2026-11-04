import { createHashRouter, Outlet, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Header } from './components/Header';
import { GameDetailPage } from './pages/GameDetailPage';
import { HomePage } from './pages/HomePage';
import { MyGamesPage } from './pages/MyGamesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
}

/**
 * Rutas de la app: un layout con el encabezado común, la home en `/`, el detalle en `/game/:id`, "Mis partidas" en
 * `/my-games` (DL-10 de #13) y una página para cualquier otra ruta.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'game/:id', element: <GameDetailPage /> },
      { path: 'my-games', element: <MyGamesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createHashRouter(appRoutes);

/**
 * Raíz de la app con router por hash (`#/ruta`). La app se publica como sitio estático (#15): con el hash, el
 * servidor siempre entrega `index.html` y la ruta la resuelve el navegador, sin reglas de reescritura en el hosting
 * ni 404 al recargar o compartir un link profundo.
 */
export function App() {
  return <RouterProvider router={router} />;
}
