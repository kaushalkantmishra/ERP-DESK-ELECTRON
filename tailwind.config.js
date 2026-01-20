/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code inspired themes
        'vscode-bg': 'var(--vscode-bg)',
        'vscode-sidebar': 'var(--vscode-sidebar)',
        'vscode-titlebar': 'var(--vscode-titlebar)',
        'vscode-border': 'var(--vscode-border)',
        'vscode-hover': 'var(--vscode-hover)',
        'vscode-active': 'var(--vscode-active)',
        'vscode-text': 'var(--vscode-text)',
        'vscode-text-muted': 'var(--vscode-text-muted)',
        'vscode-accent': 'var(--vscode-accent)',
        'vscode-accent-hover': 'var(--vscode-accent-hover)',
        'vscode-input-bg': 'var(--vscode-input-bg)',
        'vscode-input-border': 'var(--vscode-input-border)',
        
        // Status colors
        'status-success': '#89d185',
        'status-warning': '#d7ba7d',
        'status-error': '#f48771',
        'status-info': '#75beff',
        
        // Priority colors
        'priority-low': '#89d185',
        'priority-medium': '#d7ba7d',
        'priority-high': '#f48771',
        'priority-urgent': '#ff6b6b',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        'sans': ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'titlebar': '30px',
        'sidebar': '220px',
        'sidebar-collapsed': '48px',
      },
    },
  },
  plugins: [],
}
