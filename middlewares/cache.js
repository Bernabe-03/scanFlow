
const redis = require('redis');
const client = redis.createClient();

const cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    
    client.get(key, (err, reply) => {
      if (reply) {
        res.send(JSON.parse(reply));
      } else {
        res.originalSend = res.send;
        res.send = (body) => {
          client.setex(key, duration, body);
          res.originalSend(body);
        };
        next();
      }
    });
  };
};

// Utilisation
router.get('/status', cache(300), getCashierStatus);