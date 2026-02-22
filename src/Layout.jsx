import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Calendar, Bell, Settings, Heart, Stethoscope, UtensilsCrossed } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const { auth } = await import('./api/base44Client').then(m => m.base44);
        const userData = await auth.me();
        setUser(userData);
      } catch (err) {
        // Ignore errors
      }
    };
    loadUser();
  }, []);

  const navItems = [
    { name: 'Home', label: 'Início', icon: Home },
    { name: 'Historico', label: 'Histórico', icon: Calendar },
    { name: 'Alimentacao', label: 'Alimentação', icon: UtensilsCrossed },
    { name: 'Consultas', label: 'Consultas', icon: Stethoscope },
    { name: 'UploadDados', label: 'Meus Dados', icon: Settings },
    { name: 'RegistoRefeicoes', label: 'Registo', icon: UtensilsCrossed, staffOnly: true },
    { name: 'Alertas', label: 'Alertas', icon: Bell },
    { name: 'Definicoes', label: 'Definições', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Monitor de Atividade</h1>
                <p className="text-xs text-gray-500">Acompanhamento do lar</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navItems.filter(item => !item.staffOnly || (user && (user.role === 'admin' || user.role === 'staff'))).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Navigation - Desktop */}
      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 p-4">
        <div className="space-y-2">
          {navItems.filter(item => !item.staffOnly || (user && (user.role === 'admin' || user.role === 'staff'))).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style>{`
        @media (min-width: 768px) {
          main {
            margin-left: 16rem;
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}