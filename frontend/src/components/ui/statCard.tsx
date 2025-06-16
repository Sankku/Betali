interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  bgColor: string;
  textColor: string;
  valueColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  bgColor,
  textColor,
  valueColor,
}) => (
  <div className={`${bgColor} rounded-lg p-4`}>
    <div className="flex items-center">
      {icon}
      <div className="ml-4">
        <p className={`text-sm font-medium ${textColor}`}>{title}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  </div>
);

export default StatCard;
