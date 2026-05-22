/*
 * Title: Auto Hive Api
 * Description: Main server file for the Auto Hive application
 * Author: Mishu Debnath
 * Date: 18/05/2026
 */



const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// config
dotenv.config();
const PORT = process.env.PORT || 4000;
const uri = process.env.MONGODB_URI


// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());




// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
    const headers = req?.headers?.authorization;
    if (!headers) {
        return res.status(401).send({ message: 'Unauthorize' })
    }

    const token = headers?.split(" ")[1]


    if (!token) {
        return res.status(401).send({ message: 'Unauthorize' })
    }


    try {

        const { payload } = await jwtVerify(token, JWKS);
        console.log(payload);
        next();
    } catch (error) {
        return console.error('Token validation failed:', error);
    }



}

async function run() {
    const db = client.db('autoHive')

    const cars = db.collection('cars');
    const user = db.collection('user');
    const bookings = db.collection('bookings');


    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // post one cars
        app.post('/cars', verifyToken, async (req, res) => {
            try {
                const carsData = req.body;

                const result = await cars.insertOne(carsData);

                res.status(200).send({
                    success: true,
                    message: 'cars added successfully',
                    data: result
                });
                console.log(result);
            } catch (error) {

                console.log(error);

                res.status(500).send({
                    success: false,
                    message: 'Failed to add cars',
                    error: error.message
                })
            }
        });


        // get all cars 
        app.get('/cars', async (req, res) => {
            try {
                const { search, type } = req.query;

                let query = {};

                if (search) {
                    query.carName = {
                        $regex: search,
                        $options: "i",
                    };
                }

                if (type) {
                    query.carType = type;
                }

                const carsData = await cars.find(query).toArray();

                res.status(200).send({
                    success: true,
                    message: "cars get successfully",
                    data: carsData,
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: "cars get failed",
                    error: error.message,
                });
            }
        });


        // get abileable cars 
        app.get('/available-cars', async (req, res) => {
            try {

                const availableCars = await cars.find({
                    availabilityStatus: "available"
                }).limit(6).toArray();

                res.status(200).send({
                    success: true,
                    message: "available cars get successfully",
                    data: availableCars,
                });

            } catch (error) {

                res.status(500).send({
                    success: false,
                    message: "available cars get failed",
                    error: error.message,
                });
            }
        });






        // get cars by id
        app.get('/cars/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            console.log("idd", id);
            const query = {
                _id: new ObjectId(id)
            }



            try {
                const carsDataByID = await cars.findOne(query);
                res.status(200).send({
                    success: true,
                    message: 'Single cars get successfully',
                    data: carsDataByID
                });

            } catch (error) {
                console.log(error);
                res.status(500).send({
                    success: false,
                    message: 'Single cars get failed',
                    error: error.message
                });
            }
        });


        // get cars by user id 
        app.get('/my-cars/:id', verifyToken, async (req, res) => {
            try {
                const userId = req.params.id;

                const result = await cars.find({ userId }).toArray();

                res.status(200).send({
                    success: true,
                    data: result
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message
                });
            }
        });

        
        app.delete('/my-cars/:id', verifyToken, async (req, res) => {

            const { id } = req.params;

            const query = {
                _id: new ObjectId(id)
            }

            try {

                const deletedcars = await cars.deleteOne(query);

                console.log(deletedcars);

                res.status(200).send({
                    success: true,
                    message: 'Delete cars successfully',
                    data: deletedcars
                });

            } catch (error) {

                console.log(error);
                res.status(500).send({
                    success: false,
                    message: 'Delete cars  failed',
                    error: error.message
                });
            }
        });

        // edit my added cars
        app.patch('/cars/:id', verifyToken, async (req, res) => {

            const data = req.body;
            const { id } = req.params;
            const query = {
                _id: new ObjectId(id)
            }
            const document = {
                $set: data
            }

            try {
                const editedcars = await cars.updateOne(query, document);
                res.status(200).send({
                    success: true,
                    message: 'Edit cars successfully',
                    data: editedcars
                });
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    success: false,
                    message: 'Edit cars  failed',
                    error: error.message
                });
            }
        });





        //  car bokings  
        app.post('/bookings', verifyToken, async (req, res) => {

            try {

                const bookingData = req.body;

                const { carId } = bookingData;

              
                const bookingsCar = await bookings.insertOne(bookingData);

                
                await cars.updateOne(
                    { _id: new ObjectId(carId) },
                    { $inc: { bookingCount: 1 } }
                );

                res.status(200).send({
                    success: true,
                    message: 'Booking car successfully',
                    data: bookingsCar
                });

            } catch (error) {

                console.log(error);

                res.status(500).send({
                    success: false,
                    message: 'Booking car failed',
                    error: error.message
                });
            }
        });



        app.get('/bookings/:userId', verifyToken, async (req, res) => { 

            const userId = req?.params.userId;
            const query = {
                userId: userId
            }

            try {
                const bookinsData = await bookings.find(query).toArray();
                res.status(200).send({
                    success: true,
                    message: 'Bookings car successfully',
                    data: bookinsData
                });

            } catch (error) {
                console.log(error);
                res.status(500).send({
                    success: false,
                    message: 'Bookings cars get failed',
                    error: error.message
                });
            }

        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('autohive api')
});

app.listen(PORT, () => {
    console.log(`app lisen in ${PORT}`);
}) 