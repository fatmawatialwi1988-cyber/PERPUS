import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 200,
  height = 50,
  showText = true,
}) => {
  // Let's create a deterministic representation of a barcode using SVG lines
  // Seed a pseudo-random bar pattern based on the text string value
  const generatePattern = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pattern: number[] = [];
    const len = 40; // number of bars
    for (let i = 0; i < len; i++) {
      const bit = (Math.abs(hash) >> (i % 31)) & 1;
      // alternate quiet and dark bars of varying widths
      if (i % 2 === 0) {
        pattern.push(bit ? 2 : 1); // dark bar width
      } else {
        pattern.push(bit ? 3 : 1); // light gap width
      }
    }
    return pattern;
  };

  const pattern = generatePattern(value);
  let currentX = 10;
  const bars: React.ReactNode[] = [];

  pattern.forEach((w, index) => {
    const isDark = index % 2 === 0;
    if (isDark) {
      bars.push(
        <rect
          key={index}
          x={currentX}
          y={5}
          width={w}
          height={height - 15}
          fill="black"
        />
      );
    }
    currentX += w;
  });

  const totalWidth = currentX + 10;

  return (
    <div className="flex flex-col items-center bg-white p-2 rounded shadow-sm border border-gray-100 max-w-max">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto"
      >
        {bars}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#374151"
            fontWeight="bold"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
};
