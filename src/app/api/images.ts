// pages/api/images/[...path].js
import fs from 'fs';
import path from 'path';

export default function handler(req: any, res: any) {
  // Ensure LOCAL_UPLOAD_PATH is set, otherwise return 404
  if (!process.env.LOCAL_UPLOAD_PATH) {
    return res.status(404).send('Environment path not configured');
  }

  const { path: imagePath } = req.query;
  const basePath = process.env.LOCAL_UPLOAD_PATH;
  const filePath = path.join(basePath, ...imagePath);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Image not found');
  }

  const imageBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();  // remove the dot from extension

  // Supported image types
  const supportedTypes = ['jpeg', 'png', 'gif', 'bmp', 'webp'];
  if (supportedTypes.includes(ext)) {
    res.setHeader('Content-Type', `image/${ext === 'jpeg' ? 'jpeg' : ext}`);
    res.send(imageBuffer);
  } else {
    res.status(415).send('Unsupported media type');
  }
}