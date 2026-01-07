import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Library, Clock, Star, LayoutGrid, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function SidebarLayout() {
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex min-h-screen bg-[var(--bg-body)] pb-20 lg:pb-0">
            {/* Desktop Navigation Sidebar (Collapsed) */}
            <aside className="hidden lg:flex flex-col w-[80px] h-screen sticky top-0 border-r border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 backdrop-blur-xl z-50 items-center py-8 gap-8">
                {/* Logo */}
                <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-bold font-serif text-xl cursor-pointer" onClick={() => navigate('/')}>
                    R.
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col gap-6 flex-1 w-full items-center justify-center">
                    <NavItem
                        icon={<LayoutGrid size={24} />}
                        active={isActive('/')}
                        tooltip="首页"
                        onClick={() => navigate('/')}
                    />
                    <NavItem
                        icon={<Library size={24} />}
                        active={isActive('/library')}
                        tooltip="书架"
                        onClick={() => navigate('/library')}
                    />
                    <NavItem
                        icon={<Star size={24} />}
                        active={isActive('/favorites')}
                        tooltip="收藏"
                        onClick={() => navigate('/favorites')}
                    />
                    <NavItem
                        icon={<Clock size={24} />}
                        active={isActive('/history')}
                        tooltip="历史"
                        onClick={() => navigate('/history')}
                    />
                </nav>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-6 w-full items-center pb-4">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                        <Settings size={20} />
                    </button>
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-200 to-orange-100 border-2 border-white dark:border-black shadow-lg cursor-pointer" />
                </div>
            </aside>

            {/* Mobile Bottom Bar */}
            <nav className="fixed bottom-0 left-0 w-full h-16 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 lg:hidden flex justify-around items-center z-50 px-2 transition-transform duration-300">
                <button
                    className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    onClick={() => navigate('/')}
                >
                    <LayoutGrid size={20} strokeWidth={isActive('/') ? 2.5 : 2} />
                    <span className="text-[10px] font-bold mt-1">首页</span>
                </button>
                <button
                    className={`flex flex-col items-center p-2 ${isActive('/library') ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    onClick={() => navigate('/library')}
                >
                    <Library size={20} strokeWidth={isActive('/library') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium mt-1">书架</span>
                </button>
                <button
                    className={`flex flex-col items-center p-2 ${isActive('/history') ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    onClick={() => navigate('/history')}
                >
                    <Clock size={20} strokeWidth={isActive('/history') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium mt-1">历史</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-400" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="text-[10px] font-medium mt-1">模式</span>
                </button>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                <Outlet />
            </main>
        </div>
    );
}

// Sub-component
function NavItem({ icon, active, tooltip, onClick }: { icon: React.ReactNode, active?: boolean, tooltip: string, onClick: () => void }) {
    return (
        <div className="relative group flex justify-center w-full">
            <button
                onClick={onClick}
                className={`p-3 rounded-xl transition-all duration-300 ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
                {icon}
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 side-tooltip group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {tooltip}
            </div>
        </div>
    );
}
