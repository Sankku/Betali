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
    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 cursor-pointer ${
      isActive
        ? "bg-primary-100 text-primary-700 font-medium"
        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span>{label}</span>
  </Link>
);
