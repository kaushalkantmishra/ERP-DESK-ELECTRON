import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMockData } from '../contexts/MockContext';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

const Login = () => {
    const { login } = useMockData();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const success = await login(email, password);
            if (success) {
                navigate(from, { replace: true });
            } else {
                setError('Invalid email or password');
            }
        } catch (err) {
            setError('An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-vscode-bg flex flex-col relative overflow-hidden font-sans text-vscode-text">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
            
            {/* Header */}
            <header className="px-8 py-6 flex items-center justify-between relative z-10 border-b border-vscode-border/50 bg-vscode-bg/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-vscode-activityBar-activeBorder to-vscode-button-bg rounded-lg flex items-center justify-center shadow-lg">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-vscode-text leading-tight">Enterprise ERP</h1>
                        <p className="text-xs text-vscode-text-muted uppercase tracking-wider">Secure Workspace</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm text-vscode-text-muted">
                    <span className="hover:text-vscode-text cursor-pointer transition-colors">Documentation</span>
                    <span className="hover:text-vscode-text cursor-pointer transition-colors">Support</span>
                    <span className="hover:text-vscode-text cursor-pointer transition-colors">Contact</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-[420px] bg-vscode-sidebar rounded-2xl shadow-2xl border border-vscode-border overflow-hidden animate-fade-in-up">
                    
                    {/* Login Header */}
                    <div className="bg-vscode-activityBar/50 p-8 text-center border-b border-vscode-border relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-vscode-activityBar-activeBorder to-transparent opacity-50"></div>
                        <h2 className="text-2xl font-bold text-vscode-text mb-2">Welcome Back</h2>
                        <p className="text-vscode-text-muted text-sm">Please sign in to your account</p>
                    </div>

                    {/* Form */}
                    <div className="p-8 pb-10">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-500 text-sm animate-shake">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-vscode-text-muted uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-vscode-text-muted group-focus-within:text-vscode-activityBar-activeBorder transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-vscode-input-bg border border-vscode-input-border rounded-lg py-3 pl-10 pr-4 text-vscode-input-fg text-sm focus:outline-none focus:border-vscode-focusBorder focus:ring-1 focus:ring-vscode-focusBorder transition-all placeholder:text-vscode-input-placeholder"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-semibold text-vscode-text-muted uppercase tracking-wider">Password</label>
                                    <a href="#" className="text-xs text-vscode-text-link hover:underline">Forgot password?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-vscode-text-muted group-focus-within:text-vscode-activityBar-activeBorder transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-vscode-input-bg border border-vscode-input-border rounded-lg py-3 pl-10 pr-4 text-vscode-input-fg text-sm focus:outline-none focus:border-vscode-focusBorder focus:ring-1 focus:ring-vscode-focusBorder transition-all placeholder:text-vscode-input-placeholder"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-vscode-button-bg hover:bg-vscode-button-hover text-vscode-button-fg font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl hover:shadow-vscode-button-bg/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group duration-200"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Sign In to Dashboard</span>
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                     {/* Login Footer */}
                    <div className="px-8 py-4 bg-vscode-activityBar/30 border-t border-vscode-border text-center">
                        <p className="text-xs text-vscode-text-muted">
                            Demo: <span className="font-mono text-vscode-text mx-1">admin@erp.com</span> / <span className="font-mono text-vscode-text mx-1">password</span>
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="px-8 py-6 border-t border-vscode-border/50 bg-vscode-bg/80 backdrop-blur-sm relative z-10 mt-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-vscode-text-muted">
                    <p>&copy; 2025 Enterprise ERP Solutions. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <span className="cursor-pointer hover:text-vscode-text transition-colors">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-vscode-text transition-colors">Terms of Service</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>System Operational</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Login;
