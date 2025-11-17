import express from 'express';
import { registerRoute } from './routes/register';
import { loginRoute } from './routes/login';
import { refreshRoute } from './routes/refresh';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/register', registerRoute);
app.post('/login', loginRoute);
app.post('/refresh', refreshRoute);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Auth Service is running on port ${PORT}`);
});
