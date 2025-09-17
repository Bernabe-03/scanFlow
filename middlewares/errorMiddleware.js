// middleware/errorMiddleware.js
import mongoose from 'mongoose';

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Ressource non trouvée';
    return res.status(404).json({
      success: false,
      message,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Une ressource avec cette valeur existe déjà';
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: message.join(', '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    return res.status(401).json({
      success: false,
      message,
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    return res.status(401).json({
      success: false,
      message,
    });
  }

  // Default to 500 server error
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur serveur',
  });
};

const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Not found - ${req.originalUrl}`);
  next(error);
};

export { notFound, errorHandler };