import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMockData } from '../contexts/MockContext';
import { ShieldCheck, User as UserIcon, Building2, ShoppingCart, Warehouse, CreditCard, ChevronRight } from 'lucide-react';
import { authService } from '../services/authService';
import { User, Role } from '../types/models';

const Login = () => {
    const { login } = useMockData();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            const fetchedUsers = await authService.getUsers();
            setUsers(fetchedUsers);
        };
        loadUsers();
    }, []);

    const handleLogin = async (user: User) => {
        setSelectedUser(user);
        setIsLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const success = await login(user.email, user.password || '');
        if (success) {
            navigate(from, { replace: true });
        }
        setIsLoading(false);
    };

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'Admin': return <ShieldCheck className="text-purple-500" />;
            case 'Procurement': return <ShoppingCart className="text-blue-500" />;
            case 'Store': return <Warehouse className="text-orange-500" />;
            case 'Dept': return <Building2 className="text-green-500" />;
            case 'Finance': return <CreditCard className="text-emerald-500" />;
            default: return <UserIcon className="text-gray-500" />;
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
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 p-6 md:p-12 overflow-hidden">
                
                {/* Left Side: Welcome - Now Top Left */}
                <div className="max-w-2xl mt-12 animate-fade-in-up">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-bold text-vscode-text tracking-tight">
                            Select a Profile <br/>
                            <span className="text-vscode-text-muted text-4xl">to Enter Workspace</span>
                        </h2>
                        <p className="text-vscode-text-muted text-lg max-w-lg leading-relaxed">
                            Welcome to the ERP Demo. Choose a user profile to simulate different roles and workflows in a realistic environment.
                        </p>
                    </div>
                    
                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="bg-vscode-sidebar/50 backdrop-blur-sm p-4 rounded-xl border border-vscode-border/50 hover:bg-vscode-sidebar transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <ShoppingCart size={20} />
                                </div>
                                <h3 className="font-semibold">Procurement</h3>
                            </div>
                            <p className="text-xs text-vscode-text-muted">Create PRs, issue RFQs, compare quotes.</p>
                        </div>
                        <div className="bg-vscode-sidebar/50 backdrop-blur-sm p-4 rounded-xl border border-vscode-border/50 hover:bg-vscode-sidebar transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                    <Warehouse size={20} />
                                </div>
                                <h3 className="font-semibold">Inventory</h3>
                            </div>
                            <p className="text-xs text-vscode-text-muted">Manage GRNs, stock levels, transfers.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: User List - Now Bottom Right Fixed Card */}
                <div className="absolute right-6 bottom-6 w-96 max-h-[calc(100vh-8rem)] bg-vscode-sidebar rounded-2xl shadow-2xl border border-vscode-border overflow-hidden animate-fade-in-up delay-100 flex flex-col z-20"> 
                    <div className="bg-vscode-activityBar/50 p-6 border-b border-vscode-border backdrop-blur-md">
                        <h3 className="text-lg font-bold">Available Accounts</h3>
                        <p className="text-xs text-vscode-text-muted">Select an account to continue</p>
                    </div>
                    
                    <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleLogin(user)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-vscode-border hover:bg-vscode-list-hover transition-all group text-left relative overflow-hidden"
                            >
                                {isLoading && selectedUser?.id === user.id && (
                                    <div className="absolute inset-0 bg-vscode-activityBar-activeBorder/10 animate-pulse"></div>
                                )}
                                
                                <div className="w-10 h-10 rounded-full bg-vscode-bg border border-vscode-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                    {getRoleIcon(user.role)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-vscode-text truncate">{user.name}</h4>
                                        <ChevronRight size={14} className="text-vscode-text-muted opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-vscode-activityBar/20 text-vscode-activityBar-activeBorder border border-vscode-activityBar-activeBorder/30 font-medium uppercase tracking-wide">
                                            {user.role}
                                        </span>
                                        <span className="text-[11px] text-vscode-text-muted truncate">{user.department}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    <div className="p-3 bg-vscode-activityBar/30 border-t border-vscode-border text-center text-[10px] text-vscode-text-muted">
                        Secure Client v1.0.0
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
