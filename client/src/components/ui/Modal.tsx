import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      data-testid="modal-overlay"
    >
      <div 
        className="bg-white border rounded-2xl p-6 w-full max-w-sm shadow-lg"
        data-testid="modal-content"
      >
        {title && (
          <div className="text-lg font-semibold mb-4" data-testid="modal-title">
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
