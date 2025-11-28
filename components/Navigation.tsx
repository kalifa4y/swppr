import React from 'react';
import { Home, History, Settings } from 'lucide-react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { screen: Screen.HOME, icon: Home, label: 'Swap' },
    { screen: Screen.HISTORY, icon: History, label: 'History' },
    { screen: Screen.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[80px]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen || (item.screen === Screen.HOME && (currentScreen === Screen.RATES || currentScreen === Screen.EXCHANGE));
        return (
          <button
            key={item.label}
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${
              isActive ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-xs mt-1 font-bold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Navigation;