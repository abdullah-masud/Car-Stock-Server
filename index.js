const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next()
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yzwqe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const inventoriesCollection = client.db('warehouseManagement').collection('inventories');
        const reviewsCollection = client.db('warehouseManagement').collection('reviews');

        // AUTH 
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // GET inventories from mongodb
        app.get('/inventories', async (req, res) => {
            const query = {};
            const cursor = inventoriesCollection.find(query);
            const inventories = await cursor.toArray();
            res.send(inventories);
        });

        // GET one inventory using specific ID
        app.get('/inventories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const inventory = await inventoriesCollection.findOne(query);
            res.send(inventory)
        })

        // POST item into backend
        app.post('/inventories', async (req, res) => {
            const newItem = req.body;
            const result = await inventoriesCollection.insertOne(newItem);
            res.send(result);
        })

        // DELETE item from inventories
        app.delete('/inventories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await inventoriesCollection.deleteOne(query);
            res.send(result);
        })

        // PUT for restock and delivered
        app.put('/inventories/:id', async (req, res) => {
            const id = req.params.id;
            const inventoryQuantity = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedStock = {
                $set: {
                    quantity: inventoryQuantity.quantity
                }
            }
            const result = await inventoriesCollection.updateOne(filter, updatedStock, options);
            res.send(result);
        })

        // GET reviews from mongodb
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // POST review into backend
        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result);
        })


        // GET myitems data
        app.get('/myitems', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = inventoriesCollection.find(query);
                const myItems = await cursor.toArray();
                res.send(myItems)
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        })

        // DELETE item from myItems
        app.delete('/myitems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await myItemsCollection.deleteOne(query);
            res.send(result);
        })


    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running warehouse server');
});

app.listen(port, () => {
    console.log('listening to port', port)
})