// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';
// import cookieParser from 'cookie-parser';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import fs from 'fs';

// import helmet from 'helmet';
// import compression from 'compression';
// import morgan from 'morgan';

// // Importation unifiée des routes
// import adminRoutes from './routes/adminRoutes.js';
// import establishmentRoutes from './routes/establishmentRoutes.js';
// import managerRoutes from './routes/managerRoutes.js'; 
// import menuRoutes from './routes/menuRoutes.js';
// import qrRoutes from './routes/qrRoutes.js';
// import cashierRoutes from './routes/cashierRoutes.js';
// import orderRoutes from './routes/orderRoutes.js';
// import publicRoutes from './routes/publicRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// import statsRoutes from './routes/statsRoutes.js';
// import uploadRoutes from './routes/uploadRoutes.js';
// import supplierRoutes from './routes/supplierRoutes.js';
// import procurementRoutes from './routes/procurementRoutes.js';
// import payslipRoutes from './routes/payslips.js';
// import expenseRoutes from './routes/expenseRoutes.js';
// import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
// import inventoryRoutes from './routes/inventoryRoutes.js';
// dotenv.config();

// const app = express();
// app.use(express.json());
// const PORT = process.env.PORT || 5000;

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const handleFormData = (req, res, next) => {
//   if (req.headers['content-type']?.startsWith('multipart/form-data')) {
//     return next();
//   }
//   express.json({ limit: '10mb' })(req, res, next);
// };

// mongoose.set('debug', true);

// // Middleware de logging amélioré
// app.use((req, res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`${timestamp} - ${req.method} ${req.url}`);
//   next();
// });

// // const corsOptions = {
// //   origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [
// //     'https://menuscann.vercel.app'
// //   ],
// //   credentials: true,
// //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
// //   allowedHeaders: [
// //     'Content-Type', 
// //     'Authorization', 
// //     'Accept',
// //     'X-Requested-With'
// //   ],
// //   optionsSuccessStatus: 200
// // };

// // app.use(cors(corsOptions));

// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'https://menuscann.vercel.app',
//       'http://localhost:5173'
//     ];
    
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: [
//     'Content-Type', 
//     'Authorization', 
//     'Accept',
//     'X-Requested-With'
//   ],
//   optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));

// app.options('*', cors(corsOptions));

// app.use(handleFormData);
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());
// app.use(helmet());
// app.use(compression());
// app.use(morgan('dev'));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // Middleware pour nettoyer les IDs de requête
// app.use((req, res, next) => {
//   if (req.params.id && typeof req.params.id === 'string') {
//     const cleaned = req.params.id.replace(/[^a-f0-9]/gi, '');
//     if (cleaned.length === 24) {
//       req.params.id = cleaned;
//     }
//   }
//   next();
// });

// // ✅ Routes API
// app.use('/api/admin', adminRoutes);
// app.use('/api/establishments', establishmentRoutes);
// app.use('/api/manager', managerRoutes); 
// app.use('/api/menu', menuRoutes);
// app.use('/api/qr', qrRoutes);
// app.use('/api/cashier', cashierRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/public', publicRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/upload', uploadRoutes);
// app.use('/api/stats', statsRoutes);
// app.use('/api/suppliers', supplierRoutes);
// app.use('/api/procurements', procurementRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/payslips', payslipRoutes);
// // Gestion des dossiers uploads
// const uploadsDir = path.join(process.cwd(), 'uploads');
// const qrCodesDir = path.join(process.cwd(), 'qr_codes');

// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
//   console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
// }

// if (!fs.existsSync(qrCodesDir)) {
//   fs.mkdirSync(qrCodesDir, { recursive: true });
//   console.log(`📁 Dossier qr_codes créé: ${qrCodesDir}`);
// }

// app.use('/uploads', express.static(uploadsDir));
// app.use('/qr_codes', express.static(qrCodesDir));

// // Route de santé
// app.get('/api/health', (req, res) => {
//   const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTÉ' : 'DÉCONNECTÉ';
//   const memoryUsage = process.memoryUsage();
  
//   res.status(200).json({
//     status: 'EN LIGNE',
//     environment: process.env.NODE_ENV || 'développement',
//     database: dbStatus,
//     uptime: process.uptime(),
//     memory: {
//       rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
//       heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
//       heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
//     },
//     timestamp: new Date()
//   });
// });

// // Gestion des erreurs
// app.use(notFound);
// app.use(errorHandler);

// // Connexion à MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverSelectionTimeoutMS: 10000,
//   socketTimeoutMS: 45000,
//   connectTimeoutMS: 10000
// })
// .then(async () => {
//   console.log('✅ MongoDB connecté avec succès');
  
//   await createInitialAdmin();
  
//   const server = app.listen(PORT, () => {
//     console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
//     console.log(`🔗 URL du Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
//     console.log(`⚙️ Environnement: ${process.env.NODE_ENV || 'développement'}`);
//   });
  
//   server.on('error', (err) => {
//     console.error('❌ Erreur du serveur:', err);
//     process.exit(1);
//   });
  
//   // Gestion propre de la fermeture
//   process.on('SIGINT', () => {
//     console.log('🛑 Arrêt du serveur...');
//     server.close(() => {
//       mongoose.connection.close();
//       console.log('✅ Serveur arrêté proprement');
//       process.exit(0);
//     });
//   });
// })
// .catch(err => {
//   console.error('❌ Échec de connexion à MongoDB:', err.message);
//   console.error('❌ Code d\'erreur:', err.code);
//   console.error('❌ Nom d\'erreur:', err.name);
//   process.exit(1);
// });

// // Fonction pour créer l'admin initial
// async function createInitialAdmin() {
//   try {
//     const User = (await import('./models/User.js')).default;
    
//     const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
//     if (!adminExists) {
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
//       await User.create({
//         fullName: 'Admin Initial',
//         email: process.env.ADMIN_EMAIL,
//         password: hashedPassword,
//         role: 'admin',
//         isActive: true
//       });
//       console.log('👑 Compte admin initial créé avec succès');
//     } else {
//       console.log('👑 Compte admin initial déjà existant');
//     }
//   } catch (err) {
//     console.error('❌ Échec de création de l\'admin initial:', err.message);
//   }
// }





import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Importation des routes
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
import uploadRoutes from './routes/uploadRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import payslipRoutes from './routes/payslips.js';
import expenseRoutes from './routes/expenseRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import inventoryRoutes from './routes/inventoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Configuration CORS CORRIGÉE pour Render
const corsOptions = {
  origin: [
    'https://menuscann.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept',
    'X-Requested-With',
    'Cookie' // ✅ Important pour les cookies
  ],
  exposedHeaders: ['Set-Cookie'], // ✅ Important pour les cookies cross-origin
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ Pré-flight requests

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(helmet());
app.use(compression());
app.use(morgan('combined')); // ✅ Logs plus détaillés

// Middleware de logging amélioré
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🌐 ${timestamp} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Middleware pour nettoyer les IDs de requête
app.use((req, res, next) => {
  if (req.params.id && typeof req.params.id === 'string') {
    const cleaned = req.params.id.replace(/[^a-f0-9]/gi, '');
    if (cleaned.length === 24) {
      req.params.id = cleaned;
    }
  }
  next();
});

// ✅ Routes API
app.use('/api/admin', adminRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/manager', managerRoutes); 
app.use('/api/menu', menuRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payslips', payslipRoutes);

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

// ✅ Route de santé améliorée
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
    timestamp: new Date(),
    cors: {
      allowedOrigins: corsOptions.origin,
      credentials: corsOptions.credentials
    }
  });
});

// ✅ Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

// ✅ Connexion à MongoDB avec meilleure gestion d'erreurs
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // ✅ Augmenté à 30s
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });
    console.log('✅ MongoDB connecté avec succès');
  } catch (error) {
    console.error('❌ Échec de connexion à MongoDB:', error.message);
    console.error('🔧 Conseils de dépannage:');
    console.error('1. Vérifiez MONGO_URI dans .env');
    console.error('2. Vérifiez les whitelist IP dans MongoDB Atlas');
    console.error('3. Vérifiez les credentials de la base de données');
    process.exit(1);
  }
};

// ✅ Démarrage du serveur
const startServer = async () => {
  try {
    await connectDB();
    await createInitialAdmin();
    
    const server = app.listen(PORT, '0.0.0.0', () => { // ✅ Écoute sur toutes les interfaces
      console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⚙️ Environnement: ${process.env.NODE_ENV || 'développement'}`);
      console.log(`🌍 CORS autorisé pour: ${corsOptions.origin.join(', ')}`);
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
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// ✅ Fonction pour créer l'admin initial
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

// ✅ Démarrage
startServer();
