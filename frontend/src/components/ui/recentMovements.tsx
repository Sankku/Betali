interface RecentMovementsProps {
  movements: Array<{
    movement_id: string;
    movement_date: string;
    movement_type: string;
    quantity: number;
    products?: {
      name: string;
    };
  }>;
}

const RecentMovements: React.FC<RecentMovementsProps> = ({ movements }) => (
  <div>
    <h5 className="text-md font-medium text-gray-900 mb-3">Recent Movements</h5>
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="space-y-3">
        {movements.slice(0, 5).map(movement => (
          <div
            key={movement.movement_id}
            className="flex justify-between items-center p-3 bg-white rounded border"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <span className="font-medium text-gray-900">{movement.movement_type}</span>
                {movement.products?.name && (
                  <span className="ml-2 text-gray-600">- {movement.products.name}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {new Date(movement.movement_date).toLocaleDateString()}
              </div>
              <div className="font-medium text-gray-900">{movement.quantity} units</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default RecentMovements;
