import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import authRoutes from './routes/authRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/system', systemRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

const server = app.listen(Number(PORT), '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    let networkIp = 'localhost';

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
            for (const iface of interfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    networkIp = iface.address;
                    break;
                }
            }
        }
    }

    console.log(`
  🚀 Server is running!
  
  Local:            http://localhost:${PORT}
  On Your Network:  http://${networkIp}:${PORT}
    `);
});
