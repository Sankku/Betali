// src/pages/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-green-600">
                  AgroPanel
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                {loading ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Bienvenido a tu Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-4 shadow">
                  <h2 className="text-lg font-semibold">Productos</h2>
                  <p className="text-3xl font-bold">12</p>
                </div>

                <div className="rounded-lg bg-white p-4 shadow">
                  <h2 className="text-lg font-semibold">Clientes</h2>
                  <p className="text-3xl font-bold">48</p>
                </div>

                <div className="rounded-lg bg-white p-4 shadow">
                  <h2 className="text-lg font-semibold">Ventas</h2>
                  <p className="text-3xl font-bold">$9,580</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-white p-4 shadow">
                <h2 className="mb-4 text-lg font-semibold">
                  Actividad Reciente
                </h2>
                <ul className="space-y-3">
                  {[
                    {
                      id: 1,
                      action: "Nueva venta registrada",
                      time: "Hace 10 minutos",
                    },
                    {
                      id: 2,
                      action: "Nuevo cliente registrado",
                      time: "Hace 2 horas",
                    },
                    {
                      id: 3,
                      action: "Actualización de inventario",
                      time: "Ayer, 18:30",
                    },
                  ].map((activity) => (
                    <li
                      key={activity.id}
                      className="flex justify-between border-b pb-2"
                    >
                      <span>{activity.action}</span>
                      <span className="text-gray-500">{activity.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
