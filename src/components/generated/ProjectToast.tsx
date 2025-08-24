import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { ProjectNotification } from '../../utils/projectBusinessLogic';

interface ProjectToastProps {
  notification: ProjectNotification | null;
  onClose: () => void;
}

export function ProjectToast({ notification, onClose }: ProjectToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      // Auto-close after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, notification.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-[100] max-w-md"
        >
          <div className={`
            rounded-lg border p-4 shadow-lg backdrop-blur-sm
            ${getBackgroundColor()}
          `}>
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold ${getTextColor()}`}>
                  {notification.title}
                </h4>
                <p className={`text-sm mt-1 ${getTextColor()} opacity-90`}>
                  {notification.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className={`
                  flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors
                  ${getTextColor()} opacity-70 hover:opacity-100
                `}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ 
                duration: (notification.duration || 3000) / 1000, 
                ease: 'linear' 
              }}
              className={`
                mt-3 h-1 rounded-full
                ${notification.type === 'success' ? 'bg-green-200' :
                  notification.type === 'warning' ? 'bg-yellow-200' :
                  notification.type === 'error' ? 'bg-red-200' :
                  'bg-blue-200'}
              `}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast Manager Hook
export function useProjectToast() {
  const [notification, setNotification] = useState<ProjectNotification | null>(null);

  const showToast = (notification: ProjectNotification) => {
    setNotification(notification);
  };

  const hideToast = () => {
    setNotification(null);
  };

  return {
    notification,
    showToast,
    hideToast
  };
}
