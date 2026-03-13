import { Router } from 'express';
import { login, logout, getUsers, getUserById } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);

export default router;
