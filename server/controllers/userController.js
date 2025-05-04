import User from "../models/user.js";
import { Purchase } from "../models/purchase.js";
import Stripe from "stripe";
import Course from "../models/course.js";
import { courseProgress } from "../models/courseProgress.js";

// Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Users enrolled courses with lecture links
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userData = await User.findById(userId).populate('enrolledCourses');

    res.json({ success: true, enrolledCourses: userData.enrolledCourses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Purchase Course with debug logs
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const origin = req.headers.origin;
    const userId = req.auth.userId;

    // Fetch user and course
    const [userData, courseData] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!userData || !courseData) {
      return res.status(404).json({
        success: false,
        message: "User or Course not found"
      });
    }

    // Debug logging for fetched data
    console.log('DEBUG ▶ userData:', userData);
    console.log('DEBUG ▶ courseData raw:', courseData);
    console.log('DEBUG ▶ price type/value:', typeof courseData.coursePrice, courseData.coursePrice);
    console.log('DEBUG ▶ discount type/value:', typeof courseData.discount, courseData.discount);
    console.log('DEBUG ▶ incoming courseId:', courseId);

    // Validate and calculate amount
    const price = Number(courseData.coursePrice);
    const disc = Number(courseData.discount);

    if (isNaN(price) || isNaN(disc)) {
      return res.status(400).json({
        success: false,
        message: `Invalid numeric data on course: price=${courseData.coursePrice}, discount=${courseData.discount}`
      });
    }

    const rawAmount = price * (1 - disc / 100);
    const amount = Math.round(rawAmount * 100) / 100;
    console.log('DEBUG ▶ final calculated amount:', amount);

    // Create purchase record
    const newPurchase = await Purchase.create({
      courseId: courseData._id,
      userId,
      amount
    });

    // Stripe checkout session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const currency = process.env.CURRENCY.toLowerCase();

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: origin,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          product_data: { name: courseData.courseTitle },
          unit_amount: Math.floor(amount * 100)
        },
        quantity: 1
      }],
      metadata: { purchaseId: newPurchase._id.toString() }
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.error('purchaseCourse error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//update user Course progress

export const updateUserCourseProgress = async (req , res) =>{
  try {
    const userId = req.auth.userId;
    const {courseId, lectureId } = req.body;

    const progressData = await courseProgress.findOne({userId , courseId})

    if(progressData){
      if(progressData.lectureCompleted.includes(lectureId)){
        return res.json({
          success: true,
          message: 'Lecture Already Completed'
        })
      }
      progressData.lectureCompleted.push(lectureId)
      await progressData.save()
    } else{
      await courseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId]
      })
    }
  } catch (error) {
    res.json({success: false, message: error.message})
  }
}

//get user progress
export const getUserProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {courseId, lectureId } = req.body;

    const progressData = await courseProgress.findOne({userId , courseId})

    res.json({success: true, progressData})
  } catch (error) {
    res.json({success: false, message: error.message})
  }
}

//add user rating to course

export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  if(!courseId || !userId || !rating || rating < 1 || rating > 5){
      return res.json({success: false, message: 'Invalid Data'})
  }

  try {
    const course = await Course.findById(courseId);
    if(!course){
      return res.json({success: false, message: 'Course Not Found'})
    }

    const user = await User.findById(userId);
    if(!user || user.enrolledCourses.includes(courseId)){
      return res.json({success: false, message: 'User Not Found or Not Enrolled'})
    }
    const existingRatingIndex = course.courseRating.findIndex(r => r.userId === userId);
    if(existingRatingIndex > -1){
      course.courseRating[existingRatingIndex].rating = rating;
    }else{
      course.courseRating.push({userId, rating});
    }
    await course.save();
    return res.json({success: true, message: 'Rating Added'})
  } catch (error) {
    return res.json({success: false, message: error.message})
  }
}
