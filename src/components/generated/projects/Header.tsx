import React from 'react';
import { Bell, Settings, User } from 'lucide-react';

// @component: Header
export const Header = () => {
  // @return
  return <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">HR</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <span>Personal Dashboard</span>
              </h1>
              <p className="text-sm text-gray-600">
                <span>Übersicht und Verwaltung</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                <span>247</span>
              </div>
              <div>
                <span>Mitarbeiter</span>
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                <span>89%</span>
              </div>
              <div>
                <span>Auslastung</span>
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                <span>12</span>
              </div>
              <div>
                <span>Projekte</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:block font-medium">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>;
};