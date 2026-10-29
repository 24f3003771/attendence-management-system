import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface WatermarkParams {
  employeeName: string;
  employeeCode: string;
  type: 'IN' | 'OUT';
  serverTime: Date;
  latitude: number;
  longitude: number;
  accuracyM: number;
  officeName: string;
}

export const photoService = {
  /**
   * Processes, watermarks, and persists attendance photo
   * @param base64Data raw base64 photo from mobile app
   * @param params metadata for naming and watermark
   * @returns public relative path `/uploads/attendance/YYYY-MM-DD/filename.jpg`
   */
  async processAndSavePhoto(base64Data: string, params: WatermarkParams): Promise<string> {
    // 1. Clean base64 string
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // 2. Prepare daily folder
    const dateStr = params.serverTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attendance', dateStr);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 3. Prepare file name: e.g. Rahul_Sharma_EMP001_IN_153045.jpg
    const safeName = params.employeeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const safeCode = params.employeeCode.replace(/[^a-zA-Z0-9]/g, '_');
    const timeStr = params.serverTime
      .toTimeString()
      .split(' ')[0]
      .replace(/:/g, '-');
    const fileName = `${safeName}_${safeCode}_${params.type}_${timeStr}_${Date.now().toString().slice(-4)}.jpg`;
    const finalFilePath = path.join(uploadsDir, fileName);

    // 4. Get image dimensions
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 1000;

    // 5. Build SVG Watermark overlay
    // Formatted time: DD/MM/YYYY, HH:mm:ss
    const formattedDateTime = params.serverTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const overlayHeight = Math.max(120, Math.round(height * 0.16));
    const fontSizeTitle = Math.max(16, Math.round(overlayHeight * 0.22));
    const fontSizeBody = Math.max(12, Math.round(overlayHeight * 0.16));

    const svgWatermark = `
      <svg width="${width}" height="${overlayHeight}">
        <style>
          .title { fill: #facc15; font-size: ${fontSizeTitle}px; font-weight: bold; font-family: sans-serif; }
          .body { fill: #ffffff; font-size: ${fontSizeBody}px; font-family: sans-serif; }
          .tag { fill: ${params.type === 'IN' ? '#22c55e' : '#ef4444'}; font-weight: bold; }
        </style>
        <rect x="0" y="0" width="${width}" height="${overlayHeight}" fill="rgba(0, 0, 0, 0.75)" />
        <rect x="0" y="0" width="8" height="${overlayHeight}" fill="${params.type === 'IN' ? '#22c55e' : '#ef4444'}" />
        <text x="20" y="${fontSizeTitle + 14}" class="title">
          ${params.employeeName} (${params.employeeCode}) - <tspan class="tag">PUNCH ${params.type}</tspan>
        </text>
        <text x="20" y="${fontSizeTitle + fontSizeBody + 26}" class="body">
          🕒 ${formattedDateTime} | Office: ${params.officeName}
        </text>
        <text x="20" y="${fontSizeTitle + fontSizeBody * 2 + 38}" class="body">
          📍 Lat: ${params.latitude.toFixed(6)}, Lon: ${params.longitude.toFixed(6)} (Acc: ${Math.round(params.accuracyM)}m)
        </text>
      </svg>
    `;

    // 6. Composite watermark on image and save as JPEG
    await sharp(buffer)
      .composite([
        {
          input: Buffer.from(svgWatermark),
          top: height - overlayHeight,
          left: 0,
        },
      ])
      .jpeg({ quality: 85 })
      .toFile(finalFilePath);

    // Return URL path for frontend & API
    return `/uploads/attendance/${dateStr}/${fileName}`;
  },
};

