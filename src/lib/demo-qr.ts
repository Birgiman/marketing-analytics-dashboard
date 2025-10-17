// QR Code de exemplo para modo demo
export const DEMO_QR_CODE = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Qo8BR0NFPEVEPwg8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+V2hhdHNBcHAgRGVtbzwvdGV4dD4KICA8dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Db25lY3QgeW91ciBwaG9uZTwvdGV4dD4KICA8cmVjdCB4PSI0MCIgeT0iNDAiIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMzMzIi8+CiAgPHJlY3QgeD0iMTIwIiB5PSI1MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMzMzIi8+CiAgPHJlY3QgeD0iNTAiIHk9IjEyMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMzMzIi8+CiAgPHJlY3QgeD0iOTAiIHk9IjkwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMzMzMiLz4KPC9zdmc+`;

export const generateDemoQR = () => {
  // QR Code realista em SVG que simula um QR real do WhatsApp
  const timestamp = Date.now();
  const qrSvg = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <!-- Background branco -->
  <rect width="256" height="256" fill="#ffffff"/>
  
  <!-- Grid de QR Code simulado com padrão realista -->
  <g fill="#000000">
    <!-- Marcadores de posição (cantos) -->
    <!-- Canto superior esquerdo -->
    <rect x="16" y="16" width="56" height="56" fill="none" stroke="#000" stroke-width="8"/>
    <rect x="28" y="28" width="32" height="32" fill="#000"/>
    
    <!-- Canto superior direito -->
    <rect x="184" y="16" width="56" height="56" fill="none" stroke="#000" stroke-width="8"/>
    <rect x="196" y="28" width="32" height="32" fill="#000"/>
    
    <!-- Canto inferior esquerdo -->
    <rect x="16" y="184" width="56" height="56" fill="none" stroke="#000" stroke-width="8"/>
    <rect x="28" y="196" width="32" height="32" fill="#000"/>
    
    <!-- Padrão central simulado (dados do QR) -->
    <rect x="80" y="20" width="8" height="8"/><rect x="96" y="20" width="8" height="8"/>
    <rect x="104" y="20" width="8" height="8"/><rect x="128" y="20" width="8" height="8"/>
    <rect x="144" y="20" width="8" height="8"/><rect x="160" y="20" width="8" height="8"/>
    
    <rect x="88" y="36" width="8" height="8"/><rect x="112" y="36" width="8" height="8"/>
    <rect x="136" y="36" width="8" height="8"/><rect x="152" y="36" width="8" height="8"/>
    
    <rect x="80" y="52" width="8" height="8"/><rect x="104" y="52" width="8" height="8"/>
    <rect x="120" y="52" width="8" height="8"/><rect x="144" y="52" width="8" height="8"/>
    <rect x="168" y="52" width="8" height="8"/>
    
    <rect x="88" y="68" width="8" height="8"/><rect x="96" y="68" width="8" height="8"/>
    <rect x="128" y="68" width="8" height="8"/><rect x="152" y="68" width="8" height="8"/>
    
    <rect x="16" y="80" width="8" height="8"/><rect x="32" y="80" width="8" height="8"/>
    <rect x="48" y="80" width="8" height="8"/><rect x="80" y="80" width="8" height="8"/>
    <rect x="112" y="80" width="8" height="8"/><rect x="136" y="80" width="8" height="8"/>
    <rect x="168" y="80" width="8" height="8"/><rect x="192" y="80" width="8" height="8"/>
    <rect x="216" y="80" width="8" height="8"/><rect x="232" y="80" width="8" height="8"/>
    
    <rect x="24" y="96" width="8" height="8"/><rect x="56" y="96" width="8" height="8"/>
    <rect x="88" y="96" width="8" height="8"/><rect x="104" y="96" width="8" height="8"/>
    <rect x="128" y="96" width="8" height="8"/><rect x="160" y="96" width="8" height="8"/>
    <rect x="184" y="96" width="8" height="8"/><rect x="208" y="96" width="8" height="8"/>
    
    <rect x="16" y="112" width="8" height="8"/><rect x="40" y="112" width="8" height="8"/>
    <rect x="72" y="112" width="8" height="8"/><rect x="96" y="112" width="8" height="8"/>
    <rect x="120" y="112" width="8" height="8"/><rect x="144" y="112" width="8" height="8"/>
    <rect x="176" y="112" width="8" height="8"/><rect x="200" y="112" width="8" height="8"/>
    <rect x="224" y="112" width="8" height="8"/>
    
    <!-- Centro - marcador de alinhamento -->
    <rect x="112" y="112" width="32" height="32" fill="none" stroke="#000" stroke-width="4"/>
    <rect x="120" y="120" width="16" height="16" fill="#000"/>
    
    <rect x="32" y="128" width="8" height="8"/><rect x="64" y="128" width="8" height="8"/>
    <rect x="80" y="128" width="8" height="8"/><rect x="160" y="128" width="8" height="8"/>
    <rect x="192" y="128" width="8" height="8"/><rect x="216" y="128" width="8" height="8"/>
    
    <rect x="16" y="144" width="8" height="8"/><rect x="48" y="144" width="8" height="8"/>
    <rect x="88" y="144" width="8" height="8"/><rect x="104" y="144" width="8" height="8"/>
    <rect x="152" y="144" width="8" height="8"/><rect x="168" y="144" width="8" height="8"/>
    <rect x="200" y="144" width="8" height="8"/><rect x="232" y="144" width="8" height="8"/>
    
    <rect x="24" y="160" width="8" height="8"/><rect x="56" y="160" width="8" height="8"/>
    <rect x="80" y="160" width="8" height="8"/><rect x="96" y="160" width="8" height="8"/>
    <rect x="112" y="160" width="8" height="8"/><rect x="144" y="160" width="8" height="8"/>
    <rect x="176" y="160" width="8" height="8"/><rect x="208" y="160" width="8" height="8"/>
    <rect x="224" y="160" width="8" height="8"/>
    
    <rect x="80" y="184" width="8" height="8"/><rect x="96" y="184" width="8" height="8"/>
    <rect x="128" y="184" width="8" height="8"/><rect x="152" y="184" width="8" height="8"/>
    <rect x="184" y="184" width="8" height="8"/><rect x="216" y="184" width="8" height="8"/>
    
    <rect x="88" y="200" width="8" height="8"/><rect x="120" y="200" width="8" height="8"/>
    <rect x="136" y="200" width="8" height="8"/><rect x="168" y="200" width="8" height="8"/>
    <rect x="192" y="200" width="8" height="8"/><rect x="224" y="200" width="8" height="8"/>
    
    <rect x="80" y="216" width="8" height="8"/><rect x="104" y="216" width="8" height="8"/>
    <rect x="128" y="216" width="8" height="8"/><rect x="144" y="216" width="8" height="8"/>
    <rect x="176" y="216" width="8" height="8"/><rect x="200" y="216" width="8" height="8"/>
    
    <rect x="96" y="232" width="8" height="8"/><rect x="112" y="232" width="8" height="8"/>
    <rect x="136" y="232" width="8" height="8"/><rect x="160" y="232" width="8" height="8"/>
    <rect x="184" y="232" width="8" height="8"/><rect x="208" y="232" width="8" height="8"/>
  </g>
  
  <!-- Timestamp único (invisível mas muda o SVG) -->
  <text x="128" y="-10" font-size="1" fill="none">${timestamp}</text>
</svg>`.trim();

  // Converter para base64
  return `data:image/svg+xml;base64,${btoa(qrSvg)}`;
};