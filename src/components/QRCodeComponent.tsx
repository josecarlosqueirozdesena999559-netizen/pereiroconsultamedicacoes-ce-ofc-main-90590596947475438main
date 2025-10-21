import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

interface QRCodeComponentProps {
  value: string;
  size?: number;
  disabled?: boolean;
}

const QRCodeComponent = ({ value, size = 160, disabled = false }: QRCodeComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value && value !== '#' && !disabled) {
      // Clear previous content
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Ensure the URL is properly formatted
      let qrValue = value;
      
      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
        qrValue = `https://${value}`;
      }
      
      // Set canvas size before generating QR code
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasSize = size * pixelRatio;
      
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      // Ensure crisp rendering on desktop
      // @ts-ignore
      canvas.style.imageRendering = 'pixelated';
      
      QRCode.toCanvas(canvas, qrValue, {
        width: canvasSize,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);
    }
  }, [value, size, disabled]);

  if (disabled || !value || value === '#') {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded border-2 border-dashed border-muted-foreground/30"
        style={{ width: size, height: size }}
      >
        <QrCode className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded border" />
      <span className="text-xs text-muted-foreground mt-1">Escaneie para baixar</span>
    </div>
  );
};

export default QRCodeComponent;