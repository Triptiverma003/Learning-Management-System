import express from 'express';
import { addCourse, updateRoleToEducator, getEducatorCourses, educatorDashBoardData, getEnrolledStudentsData} from '../controllers/educatorController.js';
import { requireAuth } from '@clerk/express';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';

const educatorRouter = express.Router();

// Add Educator Role (protected, state-changing via GET)
educatorRouter.get(
  '/update-role',
  updateRoleToEducator      // controller handles role update
);

educatorRouter.post('/add-course', upload.single('image') , protectEducator , addCourse);

educatorRouter.get('/courses' , protectEducator ,  getEducatorCourses);

educatorRouter.get('/dashboard' , protectEducator , educatorDashBoardData);

educatorRouter.get('/enrolled-students' , protectEducator , getEnrolledStudentsData);

export default educatorRouter;