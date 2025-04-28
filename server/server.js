import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./configs/mongodb.js"
import { clerkMiddleware } from "@clerk/express"
import {clerkWebHooks} from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'

//initialize express
const app = express()


//connect to database
await connectDB()

//Middlewares
app.use(cors())
app.use(clerkMiddleware())


//Routes
app.get('/' , (req, res) => res.send("Api Working"))
app.post('/clerk' , express.json() , clerkWebHooks)
app.use('/api/educator', express.json(), educatorRouter)
   
//Port
const PORT = process.env.PORT || 5000

app.listen(PORT , () => {
    console.log(`server is running on Port ${PORT}`)
})
