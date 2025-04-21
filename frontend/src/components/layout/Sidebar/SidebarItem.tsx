import { Link } from "react-router-dom";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon,
  label,
  isActive,
}) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
      isActive
        ? "bg-green-100 text-green-700 font-medium"
        : "text-gray-600 hover:bg-gray-100"
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span>{label}</span>
  </Link>
);
