import { Webhook } from "svix";
import User from "../models/user.js";
import Stripe from "stripe";
import { Purchase } from "../models/purchase.js";
import Course from "../models/Course.js";


//Api Controller Function to manage Clerk user with db

export const clerkWebHooks = async(req, res)=>{
    try{
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body) , {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const {data , type} = req.body

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.create(userData)
                    res.json({})
                    break;
            }
            
            case 'user.updated':{
                const userData = {
                    email: data.email_address[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }

                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }
            case 'user.deleted':{
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
        
            default:
                break;
        }
    }
    catch (error){
        res.json({success: false, message: error.message})
    }
}


console.log('▶ stripeWebhooks controller loaded');

// Initialize Stripe
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  console.log('▶ Received Stripe webhook');
  console.log('▶ Headers:', request.headers);
  // Attempt to log raw body (buffer or string)
  try {
    console.log('▶ Raw body:', request.body && request.body.toString());
  } catch (e) {
    console.log('▶ Unable to convert body to string');
  }

  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('▶ Webhook event verified:', event.type);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle multiple possible event types
  switch (event.type) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded': {
      console.log('▶ Handling session/payment succeeded event:', event.type);

      // Determine session object
      let session;
      if (event.type === 'checkout.session.completed') {
        session = event.data.object;
      } else {
        // payment_intent.succeeded -> fetch session list
        const paymentIntent = event.data.object;
        console.log('▶ PaymentIntent:', paymentIntent);
        const sessions = await stripeInstance.checkout.sessions.list({ payment_intent: paymentIntent.id });
        session = sessions.data[0];
        console.log('▶ Fetched session via list:', session);
      }

      const purchaseId = session.metadata && session.metadata.purchaseId;
      console.log('▶ Extracted purchaseId:', purchaseId);
      if (!purchaseId) {
        console.error('❌ No purchaseId found in metadata');
        break;
      }

      try {
        const purchaseData = await Purchase.findById(purchaseId);
        console.log('▶ Purchase data fetched:', purchaseData);

        const userData = await User.findById(purchaseData.userId);
        console.log('▶ User data fetched:', userData);

        const courseData = await Course.findById(purchaseData.courseId);
        console.log('▶ Course data fetched:', courseData);

        courseData.enrolledStudents.push(userData._id);
        userData.enrolledCourses.push(courseData._id);

        await Promise.all([courseData.save(), userData.save()]);
        console.log('▶ Enrolled user in course');

        purchaseData.status = 'completed';
        await purchaseData.save();
        console.log('▶ Updated purchase status to completed');
      } catch (err) {
        console.error('❌ Error processing success event:', err);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      console.log('▶ Handling payment_intent.payment_failed');
      const paymentIntent = event.data.object;
      console.log('▶ PaymentIntent for failed:', paymentIntent);

      try {
        const sessions = await stripeInstance.checkout.sessions.list({ payment_intent: paymentIntent.id });
        console.log('▶ Sessions list for failed:', sessions.data);
        const purchaseId = sessions.data[0].metadata.purchaseId;
        console.log('▶ Extracted purchaseId for failed:', purchaseId);

        const purchaseData = await Purchase.findById(purchaseId);
        console.log('▶ Purchase data fetched for failed:', purchaseData);

        purchaseData.status = 'failed';
        await purchaseData.save();
        console.log('▶ Updated purchase status to failed');
      } catch (err) {
        console.error('❌ Error processing payment_failed:', err);
      }
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  response.json({ received: true });
};
