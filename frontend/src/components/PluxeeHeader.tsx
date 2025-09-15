import { Link } from 'react-router-dom';

export const PluxeeHeader = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16">
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3"></div>
              <span className="text-xl font-semibold text-gray-900">Pluxee Portal</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-4">
            <Link
              to="/pluxee/admin"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Admin
            </Link>
            <Link
              to="/pluxee/empresa"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Empresa
            </Link>
            <Link
              to="/aplicar"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Aplicar
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};