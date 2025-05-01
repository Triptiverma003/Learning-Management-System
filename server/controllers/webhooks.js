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


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  console.log('▶ Received Stripe webhook');
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

  switch (event.type) {
    case 'checkout.session.completed': {
      console.log('▶ Handling checkout.session.completed');
      const session = event.data.object;
      console.log('▶ Session object:', session);
      const purchaseId = session.metadata.purchaseId;
      console.log('▶ Extracted purchaseId:', purchaseId);

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
        console.error('❌ Error processing checkout.session.completed:', err);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      console.log('▶ Handling payment_intent.payment_failed');
      const paymentIntent = event.data.object;
      console.log('▶ PaymentIntent object:', paymentIntent);
      const paymentIntentId = paymentIntent.id;
      console.log('▶ PaymentIntent ID:', paymentIntentId);

      try {
        const sessions = await stripeInstance.checkout.sessions.list({ payment_intent: paymentIntentId });
        console.log('▶ Sessions list:', sessions.data);
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