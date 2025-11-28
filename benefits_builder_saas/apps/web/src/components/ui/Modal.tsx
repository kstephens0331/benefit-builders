/**
 * Premium Modal Component
 *
 * A fully-featured modal dialog with smooth animations, backdrop blur,
 * and keyboard navigation. Perfect for confirmations, forms, and detail views.
 *
 * @example
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
 *   <ModalHeader>
 *     <ModalTitle>Confirm Action</ModalTitle>
 *   </ModalHeader>
 *   <ModalBody>Are you sure you want to proceed?</ModalBody>
 *   <ModalFooter>
 *     <Button onClick={onConfirm}>Confirm</Button>
 *     <Button variant="ghost" onClick={onClose}>Cancel</Button>
 *   </ModalFooter>
 * </Modal>
 */

"use client";

import { HTMLAttributes, useEffect, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  children: ReactNode;
  className?: string;
}

const Modal = ({
  isOpen,
  onClose,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
  className,
}: ModalProps) => {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl animate-scale-in",
          sizeStyles[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

Modal.displayName = "Modal";

// Modal Header
export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
  onClose?: () => void;
}

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, showCloseButton = true, onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between p-6 border-b border-neutral-200 dark:border-neutral-700",
          className
        )}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = "ModalHeader";

// Modal Title
const ModalTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn(
        "text-2xl font-semibold text-neutral-900 dark:text-neutral-100",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
});

ModalTitle.displayName = "ModalTitle";

// Modal Body
const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "p-6 text-neutral-700 dark:text-neutral-300",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalBody.displayName = "ModalBody";

// Modal Footer
const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = "ModalFooter";

export { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter };
