/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code inspired dark theme
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-titlebar': '#323233',
        'vscode-border': '#3e3e42',
        'vscode-hover': '#2a2d2e',
        'vscode-active': '#37373d',
        'vscode-text': '#cccccc',
        'vscode-text-muted': '#858585',
        'vscode-accent': '#0e639c',
        'vscode-accent-hover': '#1177bb',
        'vscode-input-bg': '#3c3c3c',
        'vscode-input-border': '#3e3e42',
        
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
