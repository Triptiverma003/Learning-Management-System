import { clerkClient } from '@clerk/express';
import Course from '../models/course.js';
import {v2 as cloudinary} from 'cloudinary'
import { Purchase } from '../models/purchase.js';
import User from '../models/user.js';
export const updateRoleToEducator = async (req, res) => {
  try {
    // Access userId from req.auth, which Clerk middleware adds
    const userId = req.auth.userId;

    // Log details for debugging
    console.log('Headers:', req.headers);
    console.log('Authorization:', req.headers.authorization);
    console.log('req.auth:', req.auth);
    console.log('userId:', userId);

    // Update the user's metadata to set role as 'educator'
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'educator',
      },
    });

    // Respond with a success message
    return res.json({
      success: true,
      message: 'You can publish a course now',
    });
  } catch (error) {
    console.error('❌ Error updating user metadata:', error);
    // Handle error by responding with failure message
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//Add new Course
export const addCourse = async (req, res) => {
  try {
    // Ensure Multer provided the file
    const imageFile = req.file;
    if (!imageFile) {
      return res.json({ success: false, message: 'Thumbnail not Attached' });
    }

    // Parse incoming JSON
    const parsedCourseData = JSON.parse(req.body.courseData);

    // Upload to Cloudinary before creating the course
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    // Assign the thumbnail URL and educator
    parsedCourseData.courseThumbnail = imageUpload.secure_url;
    parsedCourseData.educator       = req.auth.userId;

    // Now create the course in one go
    const newCourse = await Course.create(parsedCourseData);
    console.log("Image file received:", req.file);
    return res.json({ success: true, message: 'Course Added', course: newCourse });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
 
};


//Get Educator Courses
export const getEducatorCourses = async(req , res)=>{
  try{
    const educator = req.auth.userId;
    const courses = await Course.find({educator})
    res.json({success: true , courses})
  }catch(error){
    res.json({ success: false, message: error.message})
  }
}

//Get Educator DashBoard Data
export const educatorDashBoardData = async (req , res) => {
  try{
    const educator = req.auth.userId;
    const courses = await Course.find({educator})

    const totalCourses = courses.length;
    
    const courseIds = courses.map(course => course._id);  

    //calculate total earning
    const purchase = await Purchase.find({
      courseId: {$in: courseIds},
      status: 'completed'
  });
  const totalEarning = purchase.reduce((sum, purchase) => sum + purchase.amount , 0);
  
  //collect unique Enrolled student Ids
  const enrolledStudentsData = [];
  for(const course of courses){
    const students = await User.find({
      _id: {$in: course.enrolledStudents}
    } , 'name imageUrl');

    students.forEach(student => {
      enrolledStudentsData.push({
        courseTitle: course.courseTitle,
        student
      })
    });
  }
  res.json({success: true , dashBoardData:{
    totalEarning, enrolledStudentsData,totalCourses

  }})
}
  catch(error){
    res.json({success: false , message: error.message});
  }
}

//Get Enrolled Students Data
export const getEnrolledStudentsData = async(req , res) =>{
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({educator})
    const courseIds = courses.map(course => course._id);  

    const purchases = await Purchase.find({
      courseId: {$in: courseIds},
      status: 'completed'
    }).populate('userId' , 'name imageUrl').populate('courseId' , 'courseTitle')

    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseData: purchase.createdAt
    }));
    res.json({success: true , enrolledStudents})
  } catch (error) {
    res.json({success: false , message: error.message});
  }
}