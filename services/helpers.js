export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  export const generateUniqueId = (prefix = '') => {
    return prefix + '-' + Math.random().toString(36).substr(2, 9);
  };
  
  export const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-CI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  export const handleMongoError = (error) => {
    let message = 'Database error';
    
    if (error.code === 11000) {
      message = 'Duplicate key error';
      const field = Object.keys(error.keyValue)[0];
      message = `${field} already exists`;
    } else if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      message = errors.join(', ');
    }
    
    return message;
  };