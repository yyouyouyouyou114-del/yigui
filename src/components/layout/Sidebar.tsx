import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shirt, 
  Sparkles, 
  Lightbulb, 
  Settings,
  Home
} from 'lucide-react';
import clsx from 'clsx';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
          'hover:bg-primary-50 hover:text-primary-700',
          isActive
            ? 'bg-primary-100 text-primary-700 font-medium'
            : 'text-gray-700'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <Home size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900">智能衣柜</h2>
            <p className="text-xs text-gray-500">Fashion Assistant</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard size={20} />}
          label="仪表盘"
        />
        <NavItem
          to="/wardrobe"
          icon={<Shirt size={20} />}
          label="我的衣柜"
        />
        <NavItem
          to="/virtual-tryon"
          icon={<Sparkles size={20} />}
          label="虚拟试穿"
        />
        <NavItem
          to="/recommendations"
          icon={<Lightbulb size={20} />}
          label="搭配推荐"
        />
        <NavItem
          to="/settings"
          icon={<Settings size={20} />}
          label="设置"
        />
      </nav>
    </aside>
  );
}

