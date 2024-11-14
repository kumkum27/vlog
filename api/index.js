import express from "express";
import cors from 'cors';
import mongoose from "mongoose";
import users from './models/user.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from "cookie-parser";
import multer from "multer";
const uploadMiddleware=multer({dest:'uploads/'});
import fs from 'fs';
import Posts from "./models/Posts.js"

import Comment from "./models/comment.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { useParams } from "react-router-dom";
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// console.log(__dirname);


// import PostModel from "./models/post.js";
const app=express();

const salt=bcrypt.genSaltSync(10);
const secret='u34kuu4r8i3ryujfdhyuki28tgfhj';

app.use(cors({credentials:true, origin:'http://localhost:5173'}));
// app.use(cors({credentials:true,origin:'http://localhost:5173'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'))

// mongoose.connect('mongodb+srv://blog:yNC7v0MBEzULhZR2@cluster0.ezirbjy.mongodb.net/?retryWrites=true&w=majority');

mongoose.connect('mongodb+srv://blog:yNC7v0MBEzULhZR2@cluster0.ezirbjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// mongoose.connect("mongodb://127.0.0.1/blog")
// .then(()=>{
//     console.log("Connection is successful");
// }).catch((err)=>{
//     console.log("No Connection");
// })


app.post('/register', async(req,res)=>{
    const {username,password}=req.body;
    try{
        const userDoc=await users.create({
            username,
            password:bcrypt.hashSync(password,salt)});
        // const useregis=await userDoc.save();
        // res.json(userDoc);
        res.json(userDoc);
    }catch(e){
        console.log(e);
        res.status(400).json(e);
    }

});

app.post('/login', async(req,res)=>{
    const {username,password}=req.body;
    try{
    const userDoc= await users.findOne({username});
    const match= bcrypt.compareSync(password,userDoc.password);
    if(match){
        const token=jwt.sign({username,id:userDoc._id},secret,{},(err,token)=>{
            if(err) throw err;
            res.cookie("token",token).json({
                id:userDoc._id,
                username
            });
        });
    }else{
        res.status(400).json("not valid user");
    }
    }catch(e){
        console.log(e);
        res.status(400).json(e);
    }
    
})

app.get("/profile",(req,res)=>{
    const {token}=req.cookies;
    jwt.verify(token, secret,{},(err,info)=>{
        if (err) throw err;
        res.json(info);
    })
    // res.json(req.cookies);
})


app.post("/logout",(req,res)=>{
    res.cookie('token','').json("ok");
})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { title, summary, content, tags } = req.body;
    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('Unauthorized');

        let coverPath = '';
        if (req.file) {
            const { originalname, path } = req.file;
            const ext = originalname.split('.').pop();
            coverPath = `${path}.${ext}`;
            fs.renameSync(path, coverPath);
        }

        try {
            const newPost = await Posts.create({
                title,
                summary,
                content,
                cover: coverPath,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [], // Parse tags as array
                author: info.id
            });
            res.json(newPost);
        } catch (error) {
            res.status(400).json(error.message);
        }
    });
});

// GET endpoint to fetch a single post by ID
app.get('/post/:id', async (req, res) => {
    try {
        const post = await Posts.findById(req.params.id).populate('author', ['username']);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// PUT endpoint to update a post
app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, summary, content, tags } = req.body;
    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('Unauthorized');

        const post = await Posts.findById(id);
        if (!post) return res.status(404).json('Post not found');

        if (String(post.author) !== String(info.id)) {
            return res.status(403).json('You are not the author of this post');
        }

        let newCoverPath = post.cover;
        if (req.file) {
            const { originalname, path } = req.file;
            const ext = originalname.split('.').pop();
            newCoverPath = `${path}.${ext}`;
            fs.renameSync(path, newCoverPath);
        }

        post.title = title || post.title;
        post.summary = summary || post.summary;
        post.content = content || post.content;
        post.cover = newCoverPath;
        post.tags = tags ? tags.split(',').map(tag => tag.trim()) : post.tags; // Parse tags as array

        await post.save();
        res.json(post);
    });
});


app.get('/post',async(req,res)=>{
    res.json(await Posts.find()
    .populate('author',['username'])
    .sort({createdAt:-1})
    )
})


app.get('/post/:id',async(req,res)=>{
    const {id}= req.params;
    // res.json(id);
    const postDoc=await Posts.findById(id).populate('author',['username']);
    res.json(postDoc);
})



// Route to add a comment to a post
app.post('/post/:id/comment', async (req, res) => {
    const { content } = req.body;
    const { token } = req.cookies;
    jwt.verify(token, secret, async (err, info) => {
        if (err) return res.status(401).json('Unauthorized');
        const comment = new Comment({
            postId: req.params.id,
            author: info.id,
            content
        });
        await comment.save();
        res.json(comment);
    });
});

// Route to get comments for a specific post
app.get('/post/:id/comments', async (req, res) => {
    const comments = await Comment.find({ postId: req.params.id });
    res.json(comments);
});

// Route to delete a comment (only the author can delete)
app.delete('/comment/:id', async (req, res) => {
    const { id } = req.params;
    const { token } = req.cookies;

    jwt.verify(token, secret, async (err, user) => {
        if (err) return res.status(401).json('Unauthorized');

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json('Comment not found');

        if (comment.author.toString() !== user.id) {
            return res.status(403).json('Not authorized to delete this comment');
        }

        await Comment.findByIdAndDelete(id);
        res.json('Comment deleted successfully');
    });
});


// Route to handle likes on a post
app.post('/post/:id/like', async (req, res) => {
    const { id } = req.params;
    const { token } = req.cookies;

    jwt.verify(token, secret, async (err, user) => {
        if (err) return res.status(401).json('Unauthorized');

        const post = await Posts.findById(id);
        if (!post) return res.status(404).json('Post not found');

        const userId = user.id;

        // Check if the user has already liked the post
        const isLiked = post.likedBy.includes(userId);

        if (isLiked) {
            // Unlike the post
            post.likes -= 1;
            post.likedBy = post.likedBy.filter(id => id.toString() !== userId);
        } else {
            // Like the post
            post.likes += 1;
            post.likedBy.push(userId);
        }

        await post.save();

        // Send the updated like count and status back to the frontend
        res.json({ likes: post.likes, isLiked: !isLiked });
    });
});





// app.listen(4000);
app.listen(port,()=>{console.log('this app is running on '+port)});


// yNC7v0MBEzULhZR2

// mongodb+srv://blog:yNC7v0MBEzULhZR2@cluster0.ezirbjy.mongodb.net/?retryWrites=true&w=majority

// mongodb+srv://blog:yNC7v0MBEzULhZR2@cluster0.ezirbjy.mongodb.net/?retryWrites=true&w=majority











// app.get('/profile',async(req,res)=>{
//     res.json(req.cookies);
//     // const {token}=req.cookies;
//     // jwt.verify(token,secret,{},(err,info)=>{
//     //     if(err) throw err;
//     //     res.json(info);
//     // })
// }
// )


// app.get('/logout',(req,res)=>{
//     res.cookie('token','').json('ok');
// })