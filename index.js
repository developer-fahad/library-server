const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cookieParser());
app.use(express.json());
app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "https://library-management-4d578.web.app",
      ],
      credentials: true,
    })
  );

  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pbz3kui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares to secure Api
const logger = (req, res, next) =>{
  console.log('Log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) =>{
  const token = req?.cookies?.token;
  console.log('Token in the middleware', token);
  if(!token){
    return res.status(401).send({message: 'Unauthorized Access.'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'Unauthorized Access.'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const categoryCollection = client.db('libraryManagerDB').collection('categories');
    const booksCollection = client.db('libraryManagerDB').collection('books');
    const borrowCollection = client.db('libraryManagerDB').collection('borrow');

    // Auth related Api
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      console.log('User for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
      })
      .send({success: true});
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { maxAge: 0 })
        .send({ success: true });
    });


    // Category Api for all category section on Homepage
    app.get('/categories', async(req, res) =>{
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    // Books Api
    app.get('/books', logger, verifyToken, async(req, res) =>{
      // console.log('Token owner info ', req.user);
      // console.log('Email from ', req.query.email);
      // console.log('From cookies ', req.cookies);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'Forbidden Access.'})
      }
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/books/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await booksCollection.findOne(query)
      res.send(result)
    })

    app.post('/books', async(req, res) =>{
      const newBooks = req.body;
      const result = await booksCollection.insertOne(newBooks);
      res.send(result);
    })

    app.patch('/books/:id', async(req, res) =>{
      const id = req.params.id;
      const updatedBook = req.body;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const book = {
        $set: {
          name: updatedBook.name,
          category: updatedBook.category,
          rating: updatedBook.rating,
          photo: updatedBook.photo,
          author: updatedBook.author,
        }
      }
      const result = await booksCollection.updateOne(filter, book, options);
      res.send(result)
     })



     // borrow Api
     app.get('/borrow', async(req, res) =>{
      // console.log('Email from ', req.query.email);
      // console.log('From cookies ', req.cookies);
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await borrowCollection.find(query).toArray();
      res.send(result);
     })


     app.post('/borrow', async(req, res) =>{
      const borrow = req.body;
      console.log(borrow);
      // check if its a duplicate request
      const query = {
        email: borrow.email,
        bookId: borrow.bookId,
      }
      const alreadyBorrow = await borrowCollection.findOne(query)
      // console.log(alreadyApplied)
      if (alreadyBorrow) {
        return res
          .status(400)
          .send('You have already borrowed on this job.')
      }
      const result = await borrowCollection.insertOne(borrow);

      // // update bid count in jobs collection
      const updateDoc = {
        $inc: { quantity: -1 },
      }
      const bookQuery = { _id: new ObjectId(borrow.bookId) }
      const updateQuantity = await booksCollection.updateOne(bookQuery, updateDoc)
      // console.log(updateQuantity)
      res.send(result);
     })

     app.delete('/borrow/:id', async(req, res) =>{
      const id = req.params.id;
      // Retrieve the borrow record to get the bookId
      const borrowRecord = await borrowCollection.findOne({ _id: new ObjectId(id) });

      if (!borrowRecord) {
          return res.status(404).send('Borrow record not found');
      }
      // Increment the quantity of the corresponding book in the booksCollection
      const updateDoc = {
        $inc: { quantity: 1 }, // Increment quantity by 1
    };
    const bookQuery = { _id: new ObjectId(borrowRecord.bookId) };
    await booksCollection.updateOne(bookQuery, updateDoc);





      const query = {_id: new ObjectId(id)};
      const result = await borrowCollection.deleteOne(query);
      res.send(result)
     })


    

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send("Library Management server is running....")
})

app.listen(port, () =>{
    console.log(`Library Management server is running on port: ${port}`);
})  
