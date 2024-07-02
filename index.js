let express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { exists } = require('fs');
const { ClientRequest } = require('http');
const { query } = require('express');
const { DATABASE_URL } = process.env

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true,
  },
});
async function getPostgresVersion() {
  const client = await pool.connect();

  try {
    const response = await client.query('SELECT version()');
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}
getPostgresVersion();
//twitter clone part-3
//get all the post from a specific user 
app.get('/posts/user/:user_id', async (req, res)=>{
  const {user_id} = req.params;
  const client = await pool.connect();
  try{
    const posts = await client.query('SELECT * FROM posts WHERE user_id=$1', [user_id]);
    if(posts.rowCount>0){
      res.json(posts.rows);
    }
    else{
      res.status(400).json({error :" no posts found under this user "});
    }
  }
  catch(error){
    console.error('Error', error.message);
    res.status(500).json({error : error.message});
  }
  finally{
    client.release();
  }
})

//create a post with a user foreign key
app.post('/posts', async (req , res)=>{
  const {title, content, user_id} =req.body;
  const client = await pool.connect();
  try{
    const userExist = await client.query('SELECT * FROM users WHERE id=$1', [user_id]);
    if(userExist.rows.length > 0){
      const post = await client.query('INSERT INTO posts(title, content, user_id, created_at) VALUES($1, $2, $3, CURRENT_TIMESTAMP) RETURNING * ', [title, content, user_id]);
      res.json(post.rows[0]);
    }
    else{
      res.status(400).json({error : "does not exists"});
    }
  }
    catch(err){
      console.log(err.stack);
      res.status(500).json({error:"something went wromg, try again later"});
    }
  finally{
    client.release();
  }
});

//adding a like to a post 
app.post("/likes", async (req , res)=>{
  const {user_id, post_id}= req.body;
  const client= await pool.connect();
  try{
    const newLike=await client.query('INSERT INTO likes(user_id, post_id, created_at) VALUES($1, $2, CURRENT_TIMESTAMP) RETURNING *',[user_id, post_id]);
    res.json(newLike.rows[0]);
  }
  catch(err){
    console.log(err.stack);
    res.status(500).json({error: "error plz try again"})
  }
  finally{
    client.release();
  }
});

//delete like from a post 
app.delete('/likes/:id', async (req, res)=>{
  const {id} =req.params;
  const client = await pool.connect();
  try{
    await client.query('DELETE FROM likes WHERE id=$1', [id])
    res.json({message: "like deleted"});
  }
  catch(err){
    console.log(err.stack);
    res.status(500).json({error :" error occures, try again"})
  }
  finally{
    client.release();
  }
});

//returning the username by specific post id
app.get('/likes/post/:post_id', async (req , res)=>{
  const {post_id}= req.params;
  const client =await pool.connect();
  try{
    const likes = await client.query('SELECT users.username FROM likes INNER JOIN users ON likes.user_id=users.id WHERE likes.post_id= $1', [post_id]);
    res.json(likes.rows);
  }
  catch(err){
    console.log(err.stack);
    res.status(500).json({error :" error occures, try again"})
  }
  finally{
    client.release();
  }
})
//=====
app.get('/', (req, res) => {
  res.status(200).json({ message: "Welcome to the twitter API!" });
});

app.listen(4000, () => {
  console.log('App is listening on port 3000');
})