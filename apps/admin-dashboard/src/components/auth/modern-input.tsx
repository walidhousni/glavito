'use client';

import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
  helperText?: string;
}

export const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ label, icon, error, success, helperText, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(
              "text-sm font-medium transition-colors",
              error ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
            )}
          >
            {label}
          </Label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
              {icon}
            </div>
          )}
          
          <motion.div
            animate={{
              scale: isFocused ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <Input
              ref={ref}
              type={inputType}
              className={cn(
                "transition-all duration-200 border-2",
                icon && "pl-10",
                isPassword && "pr-12",
                error && "border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400",
                success && "border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400",
                !error && !success && "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400",
                "focus:ring-4 focus:ring-opacity-20",
                error && "focus:ring-red-500",
                success && "focus:ring-green-500",
                !error && !success && "focus:ring-blue-500",
                className
              )}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />
          </motion.div>

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </motion.div>
            </button>
          )}

          {(success || error) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {success && <CheckCircle className="h-4 w-4 text-green-500" />}
                {error && <AlertCircle className="h-4 w-4 text-red-500" />}
              </motion.div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className={cn(
                "text-xs flex items-center space-x-1",
                error ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
              )}>
                {error && <AlertCircle className="h-3 w-3" />}
                <span>{error || helperText}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

ModernInput.displayName = 'ModernInput';