import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  Wallet,
  BarChart3,
  Shield
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Proposals', href: '/proposals', icon: FileText },
  { name: 'Safes', href: '/safes', icon: Shield },
  { name: 'Transactions', href: '/transactions', icon: Wallet },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-xl">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="ml-3">
              <span className="text-xl font-bold text-white">
                MultiSig Pro
              </span>
              <p className="text-xs text-gray-300">Enterprise Web3</p>
            </div>
          </div>
          <nav className="mt-4 flex-1 space-y-2 px-3">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          
          {/* Bottom section */}
          <div className="px-3 mt-8">
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-white">Security Status</p>
                  <p className="text-xs text-green-400">All systems secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
