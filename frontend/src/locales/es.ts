export const es = {
  // Common
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    close: 'Cerrar',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    yes: 'Sí',
    no: 'No',
    active: 'Activo',
    inactive: 'Inactivo',
    view: 'Ver',
    actions: 'Acciones',
    selected: 'seleccionado(s)',
    selectAll: 'Seleccionar todo',
    deselectAll: 'Deseleccionar todo',
    noResults: 'No se encontraron resultados',
    total: 'Total',
    showing: 'Mostrando',
    of: 'de',
    name: 'Nombre',
    description: 'Descripción',
    createdAt: 'Fecha de creación',
    updatedAt: 'Última actualización',
    status: 'Estado',
    price: 'Precio',
    quantity: 'Cantidad',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    address: 'Dirección',
    notes: 'Notas',
    create: 'Crear',
    update: 'Actualizar',
  },

  // Navigation
  nav: {
    products: 'Productos',
    warehouses: 'Almacenes',
    movements: 'Movimientos',
    users: 'Usuarios',
    clients: 'Clientes',
    suppliers: 'Proveedores',
    orders: 'Ventas',
    purchaseOrders: 'Compras',
    taxManagement: 'Gestión de Impuestos',
    organizations: 'Organizaciones',
    traceability: 'Trazabilidad',
    stockControl: 'Control de Stock',
    pricing: 'Planes y Precios',
    settings: 'Configuración',
    dashboard: 'Panel de Control',
    help: 'Ayuda',
  },

  // Layout
  layout: {
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    version: 'Betali v1.0',
  },

  // Settings
  settings: {
    title: 'Configuración',
    subtitle: 'Administra tus preferencias y configuraciones de la aplicación',
    dateFormat: {
      title: 'Formato de Fecha',
      description: 'Selecciona cómo quieres ver las fechas en toda la aplicación',
      example: 'Ejemplo',
      preview: 'Vista previa con fecha actual:',
      note: 'Este formato se aplica visualmente en todas las tablas, reportes y vistas de la aplicación.',
    },
    language: {
      title: 'Idioma',
      description: 'Selecciona el idioma de la aplicación',
      spanish: 'Español',
      english: 'English',
      note: 'El idioma se aplicará en toda la interfaz de la aplicación.',
    },
  },

  // Dashboard
  dashboard: {
    title: 'Panel de Control',
    welcome: 'Bienvenido',
  },

  // Products
  products: {
    title: 'Productos',
    add: 'Agregar Producto',
    edit: 'Editar Producto',
    delete: 'Eliminar Producto',
    view: 'Ver Producto',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} producto(s)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar este producto?',
    deleteSuccess: 'Producto(s) eliminado(s) exitosamente',
    createSuccess: 'Producto creado exitosamente',
    updateSuccess: 'Producto actualizado exitosamente',
    fields: {
      name: 'Nombre del Producto',
      description: 'Descripción',
      sku: 'SKU',
      price: 'Precio',
      cost: 'Costo',
      stock: 'Stock',
      category: 'Categoría',
      barcode: 'Código de Barras',
    },
  },

  // Clients
  clients: {
    title: 'Clientes',
    add: 'Agregar Cliente',
    edit: 'Editar Cliente',
    delete: 'Eliminar Cliente',
    view: 'Ver Cliente',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} cliente(s)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar este cliente?',
    deleteSuccess: 'Cliente(s) eliminado(s) exitosamente',
    createSuccess: 'Cliente creado exitosamente',
    updateSuccess: 'Cliente actualizado exitosamente',
    fields: {
      name: 'Nombre del Cliente',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      taxId: 'RFC/NIT',
      company: 'Empresa',
    },
  },

  // Orders (Sales)
  orders: {
    title: 'Ventas',
    add: 'Agregar Venta',
    edit: 'Editar Venta',
    delete: 'Eliminar Venta',
    view: 'Ver Venta',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} venta(s)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar esta venta?',
    deleteSuccess: 'Venta(s) eliminado(s) exitosamente',
    createSuccess: 'Venta creada exitosamente',
    updateSuccess: 'Venta actualizada exitosamente',
    fields: {
      orderNumber: 'Número de Venta',
      client: 'Cliente',
      date: 'Fecha',
      status: 'Estado',
      total: 'Total',
      items: 'Artículos',
    },
    status: {
      pending: 'Pendiente',
      processing: 'En Proceso',
      completed: 'Completado',
      cancelled: 'Cancelado',
    },
  },

  // Purchase Orders
  purchaseOrders: {
    title: 'Compras',
    add: 'Agregar Compra',
    edit: 'Editar Compra',
    delete: 'Eliminar Compra',
    view: 'Ver Compra',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} compra(s)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar esta compra?',
    deleteSuccess: 'Compra(s) eliminado(s) exitosamente',
    createSuccess: 'Compra creada exitosamente',
    updateSuccess: 'Compra actualizada exitosamente',
    fields: {
      orderNumber: 'Número de Compra',
      supplier: 'Proveedor',
      warehouse: 'Almacén',
      date: 'Fecha',
      expectedDelivery: 'Entrega Esperada',
      status: 'Estado',
      total: 'Total',
      items: 'Artículos',
    },
    status: {
      draft: 'Borrador',
      pending: 'Pendiente de Aprobación',
      approved: 'Aprobado',
      received: 'Recibido',
      partiallyReceived: 'Recibido Parcialmente',
      cancelled: 'Cancelado',
    },
    actions: {
      submit: 'Enviar para Aprobación',
      approve: 'Aprobar',
      receive: 'Marcar como Recibido',
      cancel: 'Cancelar',
    },
  },

  // Warehouse
  warehouse: {
    title: 'Almacenes',
    add: 'Agregar Almacén',
    edit: 'Editar Almacén',
    delete: 'Eliminar Almacén',
    view: 'Ver Almacén',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} almacén(es)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar este almacén?',
    deleteSuccess: 'Almacén(es) eliminado(s) exitosamente',
    createSuccess: 'Almacén creado exitosamente',
    updateSuccess: 'Almacén actualizado exitosamente',
    fields: {
      name: 'Nombre del Almacén',
      location: 'Ubicación',
      capacity: 'Capacidad',
      type: 'Tipo',
    },
  },

  // Stock Movements
  stockMovements: {
    title: 'Movimientos de Stock',
    add: 'Agregar Movimiento',
    view: 'Ver Movimiento',
    fields: {
      type: 'Tipo de Movimiento',
      product: 'Producto',
      quantity: 'Cantidad',
      warehouse: 'Almacén',
      date: 'Fecha',
      reference: 'Referencia',
    },
    types: {
      in: 'Entrada',
      out: 'Salida',
      transfer: 'Transferencia',
      adjustment: 'Ajuste',
    },
  },

  // Suppliers
  suppliers: {
    title: 'Proveedores',
    add: 'Agregar Proveedor',
    edit: 'Editar Proveedor',
    delete: 'Eliminar Proveedor',
    view: 'Ver Proveedor',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} proveedor(es)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar este proveedor?',
    deleteSuccess: 'Proveedor(es) eliminado(s) exitosamente',
    createSuccess: 'Proveedor creado exitosamente',
    updateSuccess: 'Proveedor actualizado exitosamente',
    fields: {
      name: 'Nombre del Proveedor',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      taxId: 'RFC/NIT',
      contact: 'Contacto',
    },
  },

  // Users
  users: {
    title: 'Usuarios',
    add: 'Agregar Usuario',
    edit: 'Editar Usuario',
    delete: 'Eliminar Usuario',
    view: 'Ver Usuario',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} usuario(s)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar este usuario?',
    deleteSuccess: 'Usuario(s) eliminado(s) exitosamente',
    createSuccess: 'Usuario creado exitosamente',
    updateSuccess: 'Usuario actualizado exitosamente',
    fields: {
      name: 'Nombre',
      email: 'Correo Electrónico',
      role: 'Rol',
      status: 'Estado',
      lastLogin: 'Último Acceso',
    },
    roles: {
      superAdmin: 'Super Administrador',
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Empleado',
    },
  },

  // Organizations
  organizations: {
    title: 'Organizaciones',
    add: 'Agregar Organización',
    edit: 'Editar Organización',
    delete: 'Eliminar Organización',
    view: 'Ver Organización',
    deleteConfirm: '¿Estás seguro de que deseas eliminar {{count}} organización(es)?',
    deleteConfirmSingle: '¿Estás seguro de que deseas eliminar esta organización?',
    deleteSuccess: 'Organización(es) eliminado(s) exitosamente',
    createSuccess: 'Organización creada exitosamente',
    updateSuccess: 'Organización actualizada exitosamente',
    fields: {
      name: 'Nombre de la Organización',
      taxId: 'RFC/NIT',
      address: 'Dirección',
      phone: 'Teléfono',
      email: 'Correo Electrónico',
      website: 'Sitio Web',
    },
  },

  // Tax Management
  taxManagement: {
    title: 'Gestión de Impuestos',
    add: 'Agregar Impuesto',
    edit: 'Editar Impuesto',
    delete: 'Eliminar Impuesto',
    fields: {
      name: 'Nombre del Impuesto',
      rate: 'Tasa (%)',
      type: 'Tipo',
      description: 'Descripción',
    },
  },

  // Help System
  help: {
    title: 'Centro de Ayuda',
    subtitle: 'Encuentra respuestas rápidas y recursos útiles',
    tourGuided: 'Tour Guiado',
    tourGuidedDesc: 'Aprende a usar Betali con un tour interactivo paso a paso',
    faq: 'Preguntas Frecuentes',
    faqDesc: 'Respuestas a las preguntas más comunes',
    videoTutorials: 'Video Tutoriales',
    videoTutorialsDesc: 'Tutoriales en video para aprender visualmente',
    contact: 'Contactar Soporte',
    contactDesc: '¿Necesitas ayuda? Estamos aquí para ti',
    searchPlaceholder: 'Busca en las preguntas frecuentes...',
    notFound: '¿No encuentras lo que buscas?',
    contactSupport: 'Contactar Soporte',
    contactEmail: 'soporte@betali.com',

    onboarding: {
      welcome: 'Bienvenido a Betali',
      skip: 'Omitir tour guiado',
      next: 'Siguiente',
      previous: 'Anterior',
      finish: 'Finalizar',
      step: 'Paso',
      of: 'de',
      completed: 'Tour completado',
      completedMessage: '¡Felicidades! Has completado el tour guiado.',
      restartTour: 'Reiniciar Tour',
    },
  },

  // Auth
  auth: {
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recordarme',
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    dontHaveAccount: '¿No tienes una cuenta?',
    welcomeBack: 'Bienvenido de nuevo',
    createAccount: 'Crea tu cuenta',
  },

  // Date context
  dateContext: {
    invalidDate: 'Fecha inválida',
    today: 'Hoy',
    yesterday: 'Ayer',
    daysAgo: 'Hace {{days}} días',
  },

  // Errors
  errors: {
    generic: 'Ocurrió un error. Por favor intenta de nuevo.',
    network: 'Error de conexión. Verifica tu internet.',
    notFound: 'No se encontró el recurso solicitado.',
    unauthorized: 'No tienes permiso para realizar esta acción.',
    validation: 'Por favor verifica los datos ingresados.',
  },

  // Confirmations
  confirmations: {
    deleteTitle: 'Confirmar Eliminación',
    deleteMessage: '¿Estás seguro de que deseas eliminar este elemento?',
    unsavedChanges: 'Tienes cambios sin guardar. ¿Deseas continuar?',
  },
} as const;

export type TranslationKeys = typeof es;
