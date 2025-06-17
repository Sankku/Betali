export function DebugColors() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-neutral-900">Test de Colores - Tailwind CSS 4.1</h3>

      {/* Primary colors */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Primary Colors:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-2">
            <div className="w-20 h-20 bg-primary-50 rounded-lg border border-neutral-200 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-700">50</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-primary-50</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-primary-100 rounded-lg border border-neutral-200 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-700">100</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-primary-100</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-xs font-medium text-white">500</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-primary-500</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-primary-900 rounded-lg flex items-center justify-center">
              <span className="text-xs font-medium text-white">900</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-primary-900</p>
          </div>
        </div>
      </div>

      {/* Neutral colors */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Neutral Colors:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-2">
            <div className="w-20 h-20 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-700">50</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-neutral-50</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-700">100</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-neutral-100</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-neutral-200 rounded-lg flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-700">200</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-neutral-200</p>
          </div>
          <div className="space-y-2">
            <div className="w-20 h-20 bg-neutral-500 rounded-lg flex items-center justify-center">
              <span className="text-xs font-medium text-white">500</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-neutral-500</p>
          </div>
        </div>
      </div>

      {/* Status colors */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Status Colors:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="w-full h-16 bg-success-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-medium text-white">Success</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-success-500</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-16 bg-danger-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-medium text-white">Danger</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-danger-500</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-16 bg-warning-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-medium text-white">Warning</span>
            </div>
            <p className="text-xs text-neutral-600 text-center">bg-warning-500</p>
          </div>
        </div>
      </div>

      {/* Badges CSS */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Badges CSS:</h4>
        <div className="flex flex-wrap gap-3">
          <span className="badge badge-primary">Primary Badge</span>
          <span className="badge badge-success">Success Badge</span>
          <span className="badge badge-danger">Danger Badge</span>
          <span className="badge badge-warning">Warning Badge</span>
        </div>
      </div>

      {/* Switch Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Switch Test:</h4>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-11 h-6 bg-primary-500 rounded-full shadow-inner flex items-center">
              <div className="w-4 h-4 bg-white rounded-full shadow transform translate-x-6 transition-transform"></div>
            </div>
            <p className="text-xs text-neutral-600 mt-1">Active</p>
          </div>
          <div className="relative">
            <div className="w-11 h-6 bg-neutral-200 rounded-full shadow-inner flex items-center">
              <div className="w-4 h-4 bg-white rounded-full shadow transform translate-x-1 transition-transform"></div>
            </div>
            <p className="text-xs text-neutral-600 mt-1">Inactive</p>
          </div>
        </div>
      </div>

      {/* Text Shadow Test (Nueva característica de 4.1) */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Text Shadow Test (Nueva en 4.1):</h4>
        <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-6 rounded-lg">
          <p className="text-white text-xl text-shadow-sm">Shadow Small</p>
          <p className="text-white text-2xl text-shadow">Shadow Normal</p>
          <p className="text-white text-3xl text-shadow-lg">Shadow Large</p>
        </div>
      </div>

      {/* Responsive and Modern Features Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Responsive & Modern Features:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white backdrop-blur-glass border border-neutral-200 rounded-lg p-4">
            <h5 className="font-medium text-neutral-900">Glassmorphism</h5>
            <p className="text-sm text-neutral-600">backdrop-blur-glass</p>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-4 animate-fade-in">
            <h5 className="font-medium text-white">Fade Animation</h5>
            <p className="text-sm text-primary-100">animate-fade-in</p>
          </div>
          <div className="bg-neutral-100 rounded-lg p-4 animate-slide-in">
            <h5 className="font-medium text-neutral-900">Slide Animation</h5>
            <p className="text-sm text-neutral-600">animate-slide-in</p>
          </div>
        </div>
      </div>

      {/* Form Input Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-neutral-700">Form Components:</h4>
        <div className="space-y-3">
          <input type="text" placeholder="Test input con form-input class" className="form-input" />
          <textarea
            placeholder="Test textarea con form-input class"
            className="form-input resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Color Palette Information */}
      <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
        <h4 className="text-lg font-semibold text-neutral-700 mb-3">
          Información del Sistema de Colores:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-neutral-600">Formato de colores:</p>
            <p className="text-neutral-500">OKLCH para mejor consistencia perceptual</p>
          </div>
          <div>
            <p className="font-medium text-neutral-600">Soporte para modo oscuro:</p>
            <p className="text-neutral-500">light-dark() CSS function</p>
          </div>
          <div>
            <p className="font-medium text-neutral-600">Accesibilidad:</p>
            <p className="text-neutral-500">
              Contraste mejorado y soporte para prefers-reduced-motion
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-600">Compatibilidad:</p>
            <p className="text-neutral-500">Fallbacks para navegadores más antiguos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
