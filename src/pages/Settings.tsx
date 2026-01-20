import React from 'react';
import { Monitor, Palette, Sun } from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'light' as Theme,
      name: 'Light',
      description: 'Clean light theme',
      icon: <Sun size={20} />,
      preview: 'bg-white'
    },
    {
      id: 'dark' as Theme,
      name: 'Dark',
      description: 'VS Code dark theme',
      icon: <Monitor size={20} />,
      preview: 'bg-gray-900'
    },
    {
      id: 'warm' as Theme,
      name: 'Warm',
      description: 'Dark warm theme',
      icon: <Palette size={20} />,
      preview: 'bg-purple-900'
    }
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-vscode-text mb-2">Settings</h1>
        <p className="text-vscode-text-muted">Customize your application preferences</p>
      </div>

      <div className="space-y-8">
        {/* Theme Settings */}
        <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={20} className="text-vscode-accent" />
            <h2 className="text-lg font-medium text-vscode-text">Appearance</h2>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-vscode-text mb-3">Color Theme (Current: {theme})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themes.map((themeOption) => (
                <div
                  key={themeOption.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    theme === themeOption.id
                      ? 'border-vscode-accent bg-vscode-active'
                      : 'border-vscode-border hover:border-vscode-hover hover:bg-vscode-hover'
                  }`}
                  onClick={() => {
                    console.log('Clicking theme:', themeOption.id);
                    setTheme(themeOption.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {themeOption.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-vscode-text">{themeOption.name}</h4>
                        {theme === themeOption.id && (
                          <div className="w-2 h-2 bg-vscode-accent rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-vscode-text-muted mb-3">
                        {themeOption.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Other Settings Sections */}
        <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6">
          <h2 className="text-lg font-medium text-vscode-text mb-4">General</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-vscode-text">Auto-save</h3>
                <p className="text-sm text-vscode-text-muted">Automatically save changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-vscode-input-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vscode-accent"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;