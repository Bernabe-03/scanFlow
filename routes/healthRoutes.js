
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'ScanFlow API'
  });
});

export default router;