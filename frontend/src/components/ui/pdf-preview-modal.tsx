import React, { useState, useEffect, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, X, Check, Loader2 } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from './modal';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface PdfOrderItem {
  id: string;
  label: string;
}

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PdfOrderItem[];
  title?: string;
  getBatchPdfBlob: (orderIds: string[]) => Promise<Blob>;
  downloadBatchPdf: (orderIds: string[]) => Promise<void>;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  orders,
  title = 'Vista Previa de PDF',
  getBatchPdfBlob,
  downloadBatchPdf,
}) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected orders when modal opens
  useEffect(() => {
    if (isOpen && orders.length > 0) {
      setSelectedOrders(new Set(orders.map(o => o.id)));
      setCurrentPage(1);
      setError(null);
    }
  }, [isOpen, orders]);

  // Generate PDF preview whenever selected orders change
  useEffect(() => {
    const generatePreview = async () => {
      if (!isOpen || selectedOrders.size === 0) {
        setPdfUrl(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const orderIds = Array.from(selectedOrders);
        const blob = await getBatchPdfBlob(orderIds);
        const url = URL.createObjectURL(blob);

        // Clean up previous URL
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }

        setPdfUrl(url);
      } catch (err) {
        console.error('Error generating PDF preview:', err);
        setError('Error al generar la vista previa del PDF');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(generatePreview, 300);
    return () => clearTimeout(debounceTimer);
  }, [isOpen, selectedOrders, getBatchPdfBlob]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedOrders(new Set(orders.map(o => o.id)));
  };

  const deselectAll = () => {
    setSelectedOrders(new Set());
  };

  const handleDownload = async () => {
    if (selectedOrders.size === 0) return;

    setIsDownloading(true);
    try {
      const orderIds = Array.from(selectedOrders);
      await downloadBatchPdf(orderIds);
      onClose();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Error al descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = selectedOrders.size;

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalContent>
        <ModalCloseButton onClose={onClose} />
        <ModalHeader className="border-b border-neutral-200">
          <ModalTitle>{title}</ModalTitle>
          <p className="text-sm text-neutral-500 mt-1">
            {selectedOrders.size} de {orders.length} orden(es) seleccionada(s)
          </p>
        </ModalHeader>

        <ModalBody className="p-0">
          <div className="flex h-[70vh]">
            {/* Sidebar - Order Selection */}
            <div className="w-72 border-r border-neutral-200 flex flex-col bg-neutral-50">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="flex-1"
                  >
                    Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    className="flex-1"
                  >
                    Ninguno
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {orders.map((order, index) => {
                  const isSelected = selectedOrders.has(order.id);
                  return (
                    <button
                      key={order.id}
                      onClick={() => toggleOrder(order.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg mb-1 transition-all text-left',
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-neutral-300'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          Pagina {index + 1}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {order.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col bg-neutral-100">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-neutral-600">Generando vista previa...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-red-600">
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setError(null)}
                      className="mt-4"
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : selectedOrders.size === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-neutral-500">
                    <p>Selecciona al menos una orden para ver la vista previa</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <>
                  {/* PDF Viewer */}
                  <div className="flex-1 p-4">
                    <iframe
                      src={`${pdfUrl}#page=${currentPage}`}
                      className="w-full h-full rounded-lg shadow-lg bg-white"
                      title="PDF Preview"
                    />
                  </div>

                  {/* Page Navigation */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-3 bg-white border-t border-neutral-200">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={handlePrevPage}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-neutral-600">
                        Pagina {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-between items-center">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={selectedOrders.size === 0 || isDownloading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF ({selectedOrders.size} {selectedOrders.size === 1 ? 'pagina' : 'paginas'})
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PdfPreviewModal;
