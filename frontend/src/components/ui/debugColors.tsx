export function DebugColors() {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold">Test de Colores</h3>

      {/* Primary colors */}
      <div className="space-y-2">
        <h4 className="font-medium">Primary Colors:</h4>
        <div className="flex space-x-2">
          <div className="w-16 h-16 bg-primary rounded flex items-center justify-center text-white text-xs">
            bg-primary
          </div>
          <div className="w-16 h-16 bg-primary-50 rounded flex items-center justify-center text-xs">
            bg-primary-50
          </div>
          <div className="w-16 h-16 bg-primary-100 rounded flex items-center justify-center text-xs">
            bg-primary-100
          </div>
          <div className="w-16 h-16 bg-primary-500 rounded flex items-center justify-center text-white text-xs">
            bg-primary-500
          </div>
        </div>
      </div>

      {/* Neutral colors */}
      <div className="space-y-2">
        <h4 className="font-medium">Neutral Colors:</h4>
        <div className="flex space-x-2">
          <div className="w-16 h-16 bg-neutral-50 rounded flex items-center justify-center text-xs border">
            bg-neutral-50
          </div>
          <div className="w-16 h-16 bg-neutral-100 rounded flex items-center justify-center text-xs">
            bg-neutral-100
          </div>
          <div className="w-16 h-16 bg-neutral-200 rounded flex items-center justify-center text-xs">
            bg-neutral-200
          </div>
          <div className="w-16 h-16 bg-neutral-500 rounded flex items-center justify-center text-white text-xs">
            bg-neutral-500
          </div>
        </div>
      </div>

      {/* Status colors */}
      <div className="space-y-2">
        <h4 className="font-medium">Status Colors:</h4>
        <div className="flex space-x-2">
          <div className="w-16 h-16 bg-success rounded flex items-center justify-center text-white text-xs">
            bg-success
          </div>
          <div className="w-16 h-16 bg-danger rounded flex items-center justify-center text-white text-xs">
            bg-danger
          </div>
          <div className="w-16 h-16 bg-warning rounded flex items-center justify-center text-white text-xs">
            bg-warning
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-2">
        <h4 className="font-medium">Badges CSS:</h4>
        <div className="flex space-x-2">
          <span className="badge badge-primary">Primary Badge</span>
          <span className="badge badge-success">Success Badge</span>
          <span className="badge badge-danger">Danger Badge</span>
          <span className="badge badge-warning">Warning Badge</span>
        </div>
      </div>

      {/* Test del switch */}
      <div className="space-y-2">
        <h4 className="font-medium">Switch Test:</h4>
        <div className="flex space-x-4">
          <div className="w-11 h-6 bg-primary rounded-md"></div>
          <div className="w-11 h-6 bg-neutral-200 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
