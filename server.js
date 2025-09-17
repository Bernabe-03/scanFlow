import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Importation unifiée des routes
import adminRoutes from './routes/adminRoutes.js';
import establishmentRoutes from './routes/establishmentRoutes.js';
import managerRoutes from './routes/managerRoutes.js'; 
import menuRoutes from './routes/menuRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handleFormData = (req, res, next) => {
  if (req.headers['content-type']?.startsWith('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
};

mongoose.set('debug', true);

// Middleware de logging amélioré
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  next();
});

// Configuration CORS complète
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(handleFormData);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Middleware pour nettoyer les IDs de requête
app.use((req, res, next) => {
  // Nettoyer uniquement les IDs de paramètre si nécessaire
  if (req.params.id && typeof req.params.id === 'string') {
    // Garder seulement les caractères hexadécimaux mais préserver la longueur
    const cleaned = req.params.id.replace(/[^a-f0-9]/gi, '');
    // Ne garder que si c'est un ObjectId valide (24 caractères)
    if (cleaned.length === 24) {
      req.params.id = cleaned;
    }
  }
  
  next();
});

// Routes API
app.use('/api/admin', adminRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// Gestion des dossiers uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
const qrCodesDir = path.join(process.cwd(), 'qr_codes');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
}

if (!fs.existsSync(qrCodesDir)) {
  fs.mkdirSync(qrCodesDir, { recursive: true });
  console.log(`📁 Dossier qr_codes créé: ${qrCodesDir}`);
}

app.use('/uploads', express.static(uploadsDir));
app.use('/qr_codes', express.static(qrCodesDir));

// Route de santé
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTÉ' : 'DÉCONNECTÉ';
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'EN LIGNE',
    environment: process.env.NODE_ENV || 'développement',
    database: dbStatus,
    uptime: process.uptime(),
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    timestamp: new Date()
  });
});

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
})
.then(async () => {
  console.log('✅ MongoDB connecté avec succès');
  
  await createInitialAdmin();
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
    console.log(`🔗 URL du Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`⚙️ Environnement: ${process.env.NODE_ENV || 'développement'}`);
  });
  
  server.on('error', (err) => {
    console.error('❌ Erreur du serveur:', err);
    process.exit(1);
  });
  
  // Gestion propre de la fermeture
  process.on('SIGINT', () => {
    console.log('🛑 Arrêt du serveur...');
    server.close(() => {
      mongoose.connection.close();
      console.log('✅ Serveur arrêté proprement');
      process.exit(0);
    });
  });
})
.catch(err => {
  console.error('❌ Échec de connexion à MongoDB:', err.message);
  console.error('❌ Code d\'erreur:', err.code);
  console.error('❌ Nom d\'erreur:', err.name);
  process.exit(1);
});

// Fonction pour créer l'admin initial
async function createInitialAdmin() {
  try {
    const User = (await import('./models/User.js')).default;
    
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
      await User.create({
        fullName: 'Admin Initial',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log('👑 Compte admin initial créé avec succès');
    } else {
      console.log('👑 Compte admin initial déjà existant');
    }
  } catch (err) {
    console.error('❌ Échec de création de l\'admin initial:', err.message);
  }
}

