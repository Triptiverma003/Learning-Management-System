import express from 'express';

import { updateRoleToEducator } from '../controllers/educatorController.js';

const educatorRouter = express.Router();

// Add Educator Role (protected, state-changing via GET)
educatorRouter.get(
  '/update-role',
  updateRoleToEducator      // controller handles role update
);

export default educatorRouter;