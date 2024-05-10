const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "",
        "",
      ],
      credentials: true,
    })
  );


app.get('/', (req, res) =>{
    res.send("Library Management server is running....")
})

app.listen(port, () =>{
    console.log(`Library Management server is running on port: ${port}`);
})  
