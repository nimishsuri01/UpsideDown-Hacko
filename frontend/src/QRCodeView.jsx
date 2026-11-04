import React, { useMemo } from 'react';
import { generateQRCodeSVG } from './qr';

export default function QRCodeView({ text, size = 180 }) {
  const qrData = useMemo(() => {
    if (!text) return null;
    return generateQRCodeSVG(text, size, 6);
  }, [text, size]);

  if (!qrData) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F4F9', borderRadius: 8, fontSize: 12, color: '#667085' }}>
        QR Generating...
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-block', padding: '10px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <svg
        width={size}
        height={size}
        viewBox={qrData.viewBox}
        style={{ display: 'block', margin: '0 auto', shapeRendering: 'crispEdges' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100%" height="100%" fill="#FFFFFF" />
        <path d={qrData.path} fill="#172033" />
      </svg>
    </div>
  );
}

