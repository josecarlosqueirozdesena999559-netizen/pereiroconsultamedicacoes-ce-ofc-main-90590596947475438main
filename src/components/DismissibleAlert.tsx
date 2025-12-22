import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DismissibleAlertProps {
  id: string; // ID único para armazenar no localStorage
  title: string;
  description: React.ReactNode;
  variant?: 'default' | 'success' | 'info' | 'warning';
  icon?: React.ReactNode;
  className?: string;
}

const DismissibleAlert: React.FC<DismissibleAlertProps> = ({
  id,
  title,
  description,
  variant = 'default',
  icon,
  className,
}) => {
  const storageKey = `dismissed_alert_${id}`;
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === 'true') {
      setIsDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  let alertClasses = "border-l-4";
  let defaultIcon = <Info className="h-4 w-4" />;
  let titleColor = 'text-foreground';
  let borderColor = 'border-primary';
  let bgColor = 'bg-primary/5';

  switch (variant) {
    case 'success':
      defaultIcon = <CheckCircle2 className="h-4 w-4 text-success" />;
      titleColor = 'text-success';
      borderColor = 'border-success';
      bgColor = 'bg-success/5';
      break;
    case 'warning':
      defaultIcon = <AlertCircle className="h-4 w-4 text-amber-600" />;
      titleColor = 'text-amber-700';
      borderColor = 'border-amber-600';
      bgColor = 'bg-amber-500/5';
      break;
    case 'info':
      defaultIcon = <Info className="h-4 w-4 text-info" />;
      titleColor = 'text-info';
      borderColor = 'border-info';
      bgColor = 'bg-info/5';
      break;
    case 'default':
    default:
      defaultIcon = <Info className="h-4 w-4 text-primary" />;
      titleColor = 'text-primary';
      borderColor = 'border-primary';
      bgColor = 'bg-primary/5';
      break;
  }

  return (
    <Alert className={cn(alertClasses, borderColor, bgColor, className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {icon || defaultIcon}
          <div className="flex-1 min-w-0">
            <AlertTitle className={cn("font-semibold text-sm", titleColor)}>{title}</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </AlertDescription>
          </div>
        </div>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="p-1 h-auto flex-shrink-0 text-muted-foreground hover:text-foreground ml-4"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Alert>
  );
};

export default DismissibleAlert;