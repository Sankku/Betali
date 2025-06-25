import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  sideOffset?: number;
  usePortal?: boolean;
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const DropdownMenuContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
}>({
  isOpen: false,
  setIsOpen: () => {},
  triggerRef: { current: null },
});

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ asChild = false, children }) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(DropdownMenuContext);

  const handleClick = () => setIsOpen(!isOpen);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': true,
    } as any);
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {children}
    </button>
  );
};

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  align = 'end',
  className,
  sideOffset = 4,
  usePortal = true,
}) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(DropdownMenuContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen, triggerRef]);

  useEffect(() => {
    if (isOpen && triggerRef.current && usePortal) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = triggerRect.bottom + sideOffset;

      const dropdownHeight = 200;
      if (top + dropdownHeight > viewportHeight && triggerRect.top > dropdownHeight) {
        top = triggerRect.top - dropdownHeight - sideOffset;
      }

      let left = triggerRect.left;
      const dropdownWidth = 200;

      switch (align) {
        case 'start':
          left = triggerRect.left;
          break;
        case 'center':
          left = triggerRect.left + triggerRect.width / 2 - dropdownWidth / 2;
          break;
        case 'end':
        default:
          left = triggerRect.right - dropdownWidth;
          break;
      }

      if (left < 0) left = 8;
      if (left + dropdownWidth > viewportWidth) left = viewportWidth - dropdownWidth - 8;

      setPosition({ top, left });
    }
  }, [isOpen, align, sideOffset, usePortal]);

  if (!isOpen) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0',
  };

  const dropdownContent = (
    <div
      ref={contentRef}
      className={cn(
        'min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        usePortal ? 'fixed' : `absolute mt-2 ${alignmentClasses[align]}`,
        className
      )}
      style={
        usePortal
          ? {
              top: position.top,
              left: position.left,
              zIndex: 9999,
            }
          : { zIndex: 999 }
      }
    >
      {children}
    </div>
  );

  if (usePortal) {
    return createPortal(dropdownContent, document.body);
  }

  return dropdownContent;
};

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  className,
}) => {
  const { setIsOpen } = React.useContext(DropdownMenuContext);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      setIsOpen(false);
    }
  };

  return (
    <button
      className={cn(
        'w-full px-3 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 focus:bg-neutral-100',
        'focus:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:text-neutral-400',
        'flex items-center transition-colors duration-150',
        'first:rounded-t-md last:rounded-b-md',
        'hover:text-neutral-900 focus:text-neutral-900',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const DropdownMenuSeparator: React.FC = () => <div className="my-1 h-px bg-neutral-200" />;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
