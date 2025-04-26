import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./configs/mongodb.js"
import { clerkWebHooks } from './controllers/webhooks.js'

//initialize express
const app = express()

//connect to database
await connectDB()

//Middlewares
app.use(cors())
app.use(express.json())  // normal JSON for all other routes

//Routes
app.get('/', (req, res) => res.send("Api Working"))

// clerk webhook route — needs raw body
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebHooks)

//Port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`)
})
